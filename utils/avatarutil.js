var avatars = [
    "/images/avatar0.jpeg",
    "/images/avatar1.jpeg",
    "/images/avatar3.jpeg",
    "/images/avatar2.jpeg",
    "/images/avatar4.jpeg",
];
/**
 * 获取随机数
 * @param Min 最大值
 * @param Max 最小值
 * @returns {*}
 * @constructor
 */
function getRandomNum(Min,Max){
    var Range = Max - Min;
    var Rand = Math.random();
    return(Min + Math.round(Rand * Range));
}

/**
 * 生成token
 * @param userid
 * @param expires
 * @returns {String|ArrayBuffer}
 */
exports.getRandomAvatar =  function () {
    return avatars[getRandomNum(0, avatars.length - 1)];
}

// test
//for(var i = 0; i < 20; i ++){
//    console.log(this.getRandomAvatar());
//}
