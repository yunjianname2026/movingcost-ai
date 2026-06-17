/**
 * mc-identity.js — MovingCOST member session + canonical host
 * Load synchronously before page scripts that read localStorage.
 */
(function () {
  'use strict';

  var CANONICAL_ORIGIN = 'https://www.movingcost.ai';

  // Apex → www (localStorage is per-origin; keep one canonical host)
  if (location.hostname === 'movingcost.ai') {
    location.replace(CANONICAL_ORIGIN + location.pathname + location.search + location.hash);
    return;
  }

  function lsSet(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }

  function persistSession(data) {
    if (!data || typeof data !== 'object') return;
    var userId = data.userId || data.user_id;
    var email  = data.email;

    if (userId) {
      lsSet('mc_user_id', userId);
      lsSet('userId', userId);
    }
    if (email) {
      var normalized = String(email).trim().toLowerCase();
      lsSet('mc_email', normalized);
      lsSet('mc_user_email', normalized);
      lsSet('userEmail', normalized);
    }
    if (data.referralCode != null) lsSet('referralCode', data.referralCode);
    if (data.referral_code != null) lsSet('mc_referral_code', data.referral_code);
    if (data.points != null) lsSet('userPoints', String(data.points));
    if (data.membershipTier != null) lsSet('membershipTier', data.membershipTier);
    if (data.membershipStatus != null) lsSet('membershipStatus', data.membershipStatus);
    lsSet('isLoggedIn', 'true');
    lsSet('loginTimestamp', String(Date.now()));
  }

  function clearStaleEmailKeys() {
    try {
      localStorage.removeItem('mc_email');
      localStorage.removeItem('mc_user_email');
      localStorage.removeItem('userEmail');
    } catch (e) {}
  }

  function memberUrl() {
    return CANONICAL_ORIGIN + '/member';
  }

  window.MC_CANONICAL_ORIGIN = CANONICAL_ORIGIN;
  window.mcPersistSession = persistSession;
  window.mcClearStaleEmailKeys = clearStaleEmailKeys;
  window.mcMemberUrl = memberUrl;
})();
