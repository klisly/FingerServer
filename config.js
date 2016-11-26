module.exports = {
  // cronmag:'*/30 * * * * *', // dev
  cronmag:'1 */15 * * * *',  // 杂志生成
  croncrawl:'1 */10 * * * *', // 10分钟抓取一次
  cronnotifi:'1 */5 * * * *', // 5分钟通知一次一次
  max_page:3,
  pass:"3cb028cf2810",
  umeng_master_key:"xh0hpg7adsbhvgttignixvugsen0rfgx", //友盟的推送key
  umeng_app_key:"5837c14507fe65096a000b48",
};
