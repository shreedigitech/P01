/*
  ShopFlow configuration.
  Temporary local password gate.
  IMPORTANT: this is NOT server-side authentication.
*/
window.SHOP_CONFIG = {
  SUPABASE_URL: "https://aqjnyopodslmmfiitkrq.supabase.co/rest/v1/",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_zrEZTx5pAKL0Ni3sX8kYcA_4N6oWBna",

  WHATSAPP_FUNCTION: "send-whatsapp",

  // Shop@1234 -> MD5
  LOCAL_PASSWORD_ALGORITHM: "MD5",
  LOCAL_PASSWORD_HASH: "22db0a8326417d66fdd0486382dc604e",

  LOCAL_PASSWORD_HINT: "Shop@1234",

  REMEMBER_LOGIN: true,

  // Change this whenever app.js is changed.
  APP_VERSION: "20260923-02",

  CURRENCY: "INR",
  LOCALE: "en-IN"
};
