/**
 * Created by wizardholy on 2018/4/8.
 */
$(document).ready(function () {
    function changeData(data, tag){
        for(var i = 0; i < data.length; i++){
            if(!data[i].hasAttribute("data-src") && data[i].hasAttribute("src") && (data[i].getAttribute("src")).lastIndexOf('http://', 0) === 0 && (data[i].getAttribute("src")).indexOf('chuansong.me/') == -1){
                data[i].setAttribute("data-src", data[i].getAttribute("src"));
            }
            if(data[i].hasAttribute("data-src")){
                datasrc = data[i].getAttribute("data-src");
                if(datasrc.indexOf('http://www.anyv.net') == -1){
                    data[i].setAttribute("src", (tag == 'image' && datasrc.indexOf('http://read.html5.qq.com/image') == -1) ? "" + datasrc + " ": datasrc + "");
                    data[i].removeAttribute("data-src");
                    data[i].removeAttribute("style");

                }
            }

            // if(tag == 'video'){
            //     datasrc = data[i].getAttribute("src");
            //     html = '<a href="' + datasrc + '" title="" target="_blank"  rel="nofollow"><img src="http://www.anyv.net/images/playicon.jpg" alt=""></a>';
            //     data[i].parentNode.innerHTML = html;
            // }
        }
    }

    var imgs = document.getElementsByTagName('img');
    var videos = document.getElementsByClassName('video_iframe');

    changeData(imgs, 'image');
    changeData(videos, 'video');
    function addAttr(tag){
        for(var j=0;j<tag.length;j++){
            var imgSrc=tag[j].getAttribute("src");
            if(imgSrc && imgSrc.indexOf('http://mmbiz.qpic.cn') != -1){
                tag[j].setAttribute("rel", 'nofollow');
            }

            if(imgSrc && imgSrc.indexOf('https://mmbiz.qpic.cn') != -1){
                tag[j].setAttribute("rel", 'nofollow');
            }
        }
    }
    addAttr(imgs)
    /**/
    if($("#js_view_source").attr("href") != 'undefined'){
        //$("#js_view_source").attr("href",$("#source_url").val());
        $("#js_view_source").html('');
    }

});
/**
 * Created by yang on 2017/9/5.
 */
