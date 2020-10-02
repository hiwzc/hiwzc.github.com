(function ($) {
    $(document).ready(function () {

        var animateSpeed = 500;

        $(".icon-go-top").hide();
        $(".icon-go-bottom").show();

        if (window.location.pathname != "/") {
            $(".icon-go-index").show();
        } else {
            $(".icon-go-index").hide();
        }

        $(window).scroll(function () {
            var scrollTop = $(document).scrollTop();

            if (scrollTop > document.documentElement.clientHeight / 2) {
                $(".icon-go-top").stop().fadeTo(300, 1);
            } else {
                $(".icon-go-top").stop().fadeTo(300, 0);
                $(".icon-go-top").hide();
            }

            if (scrollTop < document.documentElement.scrollHeight - document.documentElement.clientHeight * 1.1) {
                $(".icon-go-bottom").stop().fadeTo(300, 1);
            } else {
                $(".icon-go-bottom").stop().fadeTo(300, 0);
                $(".icon-go-bottom").hide();
            }
        });

        $(".icon-go-top").click(function () {
            $('html, body').animate({ scrollTop: 0 }, animateSpeed); return false;
        });

        $(".icon-go-index").click(function () {
            window.location = "/";
        });

        $(".icon-go-bottom").click(function () {
            $('html, body').animate({ scrollTop: document.documentElement.scrollHeight }, animateSpeed); return false;
        });
    })
})(jQuery)
