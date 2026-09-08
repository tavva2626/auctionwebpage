const STORAGE_KEY = 'auctionApp.auctions';

function loadAuctions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

function isQuotaExceeded(e) {
  if (!e) return false;
  return (
    e.code === 22 ||
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  );
}

function sanitizeForStorage(input) {
  try {
    const copy = JSON.parse(JSON.stringify(input));

    const sanitizeAuction = (a) => {
      // Remove or shrink any large binary/data fields that commonly exceed quota
      if (a.imagePreviews && Array.isArray(a.imagePreviews)) {
        // keep at most first preview (likely a small thumbnail) and drop data URLs
        a.imagePreviews = a.imagePreviews
          .slice(0, 1)
          .map((p) => (typeof p === 'string' && p.startsWith('data:') ? '' : p));
      }
      if (a.items && Array.isArray(a.items)) {
        a.items.forEach((it) => {
          if (it.imagePreviews && Array.isArray(it.imagePreviews)) {
            it.imagePreviews = it.imagePreviews
              .slice(0, 1)
              .map((p) => (typeof p === 'string' && p.startsWith('data:') ? '' : p));
          }
          // drop very large nested arrays like bids history if present
          if (it.bids && Array.isArray(it.bids) && it.bids.length > 50) {
            it.bids = it.bids.slice(-20);
          }
        });
      }
      if (a.bidders && Array.isArray(a.bidders)) {
        a.bidders.forEach((b) => {
          if (b.bids && Array.isArray(b.bids) && b.bids.length > 50) {
            b.bids = b.bids.slice(-20);
          }
        });
      }
    };

    if (Array.isArray(copy)) {
      copy.forEach(sanitizeAuction);
    } else if (copy && typeof copy === 'object') {
      sanitizeAuction(copy);
    }

    return copy;
  } catch (err) {
    return input;
  }
}

function saveAuctions(auctions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auctions));
    return true;
  } catch (e) {
    if (isQuotaExceeded(e)) {
      console.warn('localStorage quota exceeded, attempting to sanitize stored data and retry');
      const sanitized = sanitizeForStorage(auctions);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        return true;
      } catch (err) {
        console.error('Failed to store auctions after sanitization', err);
        // as a last resort, try sessionStorage (smaller lifetime) or skip saving
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
          console.warn('Saved auctions to sessionStorage as fallback');
          return true;
        } catch (err2) {
          console.error('Failed to save to sessionStorage fallback', err2);
          return false;
        }
      }
    }
    throw e;
  }
}

export function getAuctionById(auctionId) {
  const auctions = loadAuctions();
  return auctions.find((a) => a.id === auctionId) || null;
}

export function createAuction(auction) {
  const auctions = loadAuctions();
  auctions.unshift(auction);
  saveAuctions(auctions);
  return auction;
}

export function updateAuction(auctionId, changes) {
  const auctions = loadAuctions();
  const idx = auctions.findIndex((a) => a.id === auctionId);
  if (idx === -1) return null;
  auctions[idx] = { ...auctions[idx], ...changes };
  saveAuctions(auctions);
  return auctions[idx];
}

export function addBidder(auctionId, bidder) {
  const auction = getAuctionById(auctionId);
  if (!auction) return null;
  const bidders = auction.bidders || [];
  const existing = bidders.find((b) => b.id === bidder.id);
  if (!existing) {
    bidders.push({ ...bidder, bids: [] });
  }
  return updateAuction(auctionId, { bidders });
}

export function addBid(auctionId, bidderId, amount) {
  const auction = getAuctionById(auctionId);
  if (!auction) return null;
  const bidders = (auction.bidders || []).map((b) => {
    if (b.id !== bidderId) return b;
    const nextBid = { amount, time: Date.now() };
    return { ...b, bids: [...(b.bids || []), nextBid], lastBid: amount, isDropped: false };
  });
  return updateAuction(auctionId, { bidders });
}

export function dropBid(auctionId, bidderId) {
  const auction = getAuctionById(auctionId);
  if (!auction) return null;
  const bidders = (auction.bidders || []).map((b) => {
    if (b.id !== bidderId) return b;
    return { ...b, isDropped: true };
  });
  return updateAuction(auctionId, { bidders });
}

export function generateAuctionId() {
  // Simple unique id based on timestamp and random number
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getWinner(auction) {
  if (!auction?.bidders?.length) return null;
  let winner = null;
  auction.bidders.forEach((b) => {
    // Skip dropped bidders
    if (b.isDropped) return;
    const bid = b.lastBid ?? b.basePrice ?? 0;
    if (!winner || bid > (winner.bid ?? 0)) {
      winner = { bidder: b, bid };
    }
  });
  return winner;
}

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

export function formatCurrency(value, currencyCode = 'USD') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode || 'USD',
    minimumFractionDigits: 0,
  }).format(value);
}

// Multi-item auction storage
const MULTI_STORAGE_KEY = 'auctionApp.multiAuctions';

function loadMultiAuctions() {
  try {
    const raw = localStorage.getItem(MULTI_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

function saveMultiAuctions(auctions) {
  try {
    localStorage.setItem(MULTI_STORAGE_KEY, JSON.stringify(auctions));
    return true;
  } catch (e) {
    if (isQuotaExceeded(e)) {
      console.warn('localStorage quota exceeded for multi auctions, sanitizing and retrying');
      const sanitized = sanitizeForStorage(auctions);
      try {
        localStorage.setItem(MULTI_STORAGE_KEY, JSON.stringify(sanitized));
        return true;
      } catch (err) {
        console.error('Failed to store multi auctions after sanitization', err);
        try {
          sessionStorage.setItem(MULTI_STORAGE_KEY, JSON.stringify(sanitized));
          console.warn('Saved multi auctions to sessionStorage as fallback');
          return true;
        } catch (err2) {
          console.error('Failed to save multi auctions to sessionStorage fallback', err2);
          return false;
        }
      }
    }
    throw e;
  }
}

export function createMultiItemAuction(auction) {
  const auctions = loadMultiAuctions();
  auctions.unshift(auction);
  saveMultiAuctions(auctions);
  return auction;
}

export function getMultiItemAuctionById(auctionId) {
  const auctions = loadMultiAuctions();
  return auctions.find((a) => a.id === auctionId) || null;
}

export function updateMultiItemAuction(auctionId, changes) {
  const auctions = loadMultiAuctions();
  const idx = auctions.findIndex((a) => a.id === auctionId);
  if (idx === -1) return null;
  auctions[idx] = { ...auctions[idx], ...changes };
  saveMultiAuctions(auctions);
  return auctions[idx];
}

export function addItemToMultiAuction(auctionId, item) {
  const auction = getMultiItemAuctionById(auctionId);
  if (!auction) return null;
  const items = auction.items || [];
  
  const newItem = {
    ...item,
    id: generateAuctionId(),
    status: 'waiting',
    bidders: [],
    bids: [],
    winner: null,
    timerEnd: null,
  };
  
  items.push(newItem);
  return updateMultiItemAuction(auctionId, { items });
}

export function updateItemInMultiAuction(auctionId, itemId, changes) {
  const auction = getMultiItemAuctionById(auctionId);
  if (!auction) return null;
  
  const items = (auction.items || []).map((item) => {
    if (item.id !== itemId) return item;
    return { ...item, ...changes };
  });
  
  updateMultiItemAuction(auctionId, { items });
  return items.find((i) => i.id === itemId);
}

export function addBidderToItem(auctionId, itemId, bidder) {
  const auction = getMultiItemAuctionById(auctionId);
  if (!auction) return null;
  
  const items = (auction.items || []).map((item) => {
    if (item.id !== itemId) return item;
    const bidders = item.bidders || [];
    const existing = bidders.find((b) => b.id === bidder.id);
    if (!existing) {
      bidders.push({ ...bidder, bids: [] });
    }
    return { ...item, bidders };
  });
  
  updateMultiItemAuction(auctionId, { items });
}

export function addBidToItem(auctionId, itemId, bidderId, amount) {
  const auction = getMultiItemAuctionById(auctionId);
  if (!auction) return null;
  
  const items = (auction.items || []).map((item) => {
    if (item.id !== itemId) return item;
    
    const bidders = (item.bidders || []).map((b) => {
      if (b.id !== bidderId) return b;
      const nextBid = { amount, time: Date.now() };
      return { ...b, bids: [...(b.bids || []), nextBid], lastBid: amount, isDropped: false };
    });
    
    return { ...item, bidders };
  });
  
  updateMultiItemAuction(auctionId, { items });
}

export function dropBidForItem(auctionId, itemId, bidderId) {
  const auction = getMultiItemAuctionById(auctionId);
  if (!auction) return null;
  
  const items = (auction.items || []).map((item) => {
    if (item.id !== itemId) return item;
    
    const bidders = (item.bidders || []).map((b) => {
      if (b.id !== bidderId) return b;
      return { ...b, isDropped: true };
    });
    
    return { ...item, bidders };
  });
  
  updateMultiItemAuction(auctionId, { items });
}

export function getWinnerForItem(item) {
  if (!item?.bidders?.length) return null;
  let winner = null;
  item.bidders.forEach((b) => {
    // Skip dropped bidders when finding winner
    if (b.isDropped) return;
    const bid = b.lastBid ?? item.basePrice ?? 0;
    if (!winner || bid > (winner.bid ?? 0)) {
      winner = { bidder: b, bid };
    }
  });
  return winner;
}
