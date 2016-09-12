/**
 * 获取随机数
 * @param Min 最大值
 * @param Max 最小值
 * @returns {*}
 * @constructor
 */
exports.getRandomNum=function(Min,Max){
    var Range = Max - Min;
    var Rand = Math.random();
    return(Min + Math.round(Rand * Range));
}