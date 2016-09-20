$(function () {
    $("#tab_nav li").click(function () {
        console.log("type:"+$(this).text())
        location.href = "?topic="+$(this).text()
    })

    $(".pagination.pull-right").children().click(function () {
        if($(this).hasClass("disabled")){
            return;
        }
        var curPage = $("#curpage").text();
        console.log("curPage:"+curPage)
        var next = 0;
        if($(this).text() == "下一页"){
            next = parseInt(curPage) + 1;
        } else {
            next = parseInt(curPage) - 1;
        }

        console.log("next:"+next)
        location.href = "?topic="+$("#tab_nav li.active").text()+"&page="+next;
    })
})