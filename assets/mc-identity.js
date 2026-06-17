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
    if (data.points_balance != null) lsSet('userPoints', String(data.points_balance));
    else if (data.points != null && typeof data.points === 'object' && data.points.available != null) {
      lsSet('userPoints', String(data.points.available));
    } else if (data.points != null) lsSet('userPoints', String(data.points));
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

  function lsGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  /** Apply bind-email API response to session + short-lived bind snapshot. */
  function applyBindSession(result, fallbackEmail) {
    if (!result || typeof result !== 'object') result = {};
    var uid = result.user_id || (result.user && result.user.id) || lsGet('mc_user_id');
    var em  = result.email || fallbackEmail;
    var pts = (result.points && result.points.available != null)
      ? result.points.available
      : result.points_balance;
    persistSession({
      userId: uid,
      email: em,
      referral_code: result.referral_code,
      points_balance: pts,
      membershipTier: result.membership_tier,
    });
    try {
      sessionStorage.setItem('mc_bind_ok', JSON.stringify({ user_id: uid, email: em, ts: Date.now() }));
    } catch (e) {}
    return uid;
  }

  window.MC_CANONICAL_ORIGIN = CANONICAL_ORIGIN;
  window.mcPersistSession = persistSession;
  window.mcClearStaleEmailKeys = clearStaleEmailKeys;
  window.mcMemberUrl = memberUrl;
  window.mcApplyBindSession = applyBindSession;
})();
