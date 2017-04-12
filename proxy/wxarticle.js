var mongoose = require('mongoose');
var collection = mongoose.model('WxArticle');

exports.getById = function (uid) {
   return collection.findById(uid).exec();
};

exports.create= function(data, fn){
    new collection(data).save(fn);
};

exports.updateById= function(id, datas){
    return collection.update({"_id":id},datas).exec();
};


exports.delete= function(cons){
    return collection.remove(cons).exec();
};

exports.count= function(cons){
    return collection.count(cons).exec();
};

exports.find = function (cons, page, pageSize, sorts) {
    var query = collection.find(cons);
    query.skip((page - 1) * pageSize);
    query.limit(pageSize * 1);
    if(sorts){
        query.sort(sorts)
    } else {
        query.sort({createdAt: -1})
    }
    return query.exec();
}


exports.findByYield = function *(cons, page, pageSize, sorts) {
    var query = collection.find(cons);
    query.skip((page - 1) * pageSize);
    query.limit(pageSize * 1);
    if(sorts){
        query.sort(sorts)
    } else {
        query.sort({createdAt: -1})
    }
    return yield query.exec();
}

