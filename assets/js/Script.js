$(function(){
    $('a[href*="#"]').click(function(){
        var speed = 500;
        var elmHash = $(this).attr('href');
        var pos = $(elmHash).offset().top - 200;
        $('body,html').animate({scrollTop : pos},speed);
        return false;
    });
});

$(window).scroll(function(){
    $('.moves').each(function(){
        var elmPos = $(this).offset().top;
        scroll = $(window).scrollTop();
        windowHeight = $(window).height();
        if (scroll > elmPos - windowHeight + 50){
            $(this).addClass('scrollin');
        }
    });
});

$(window).scroll(function(){
    $('.section-title').each(function(){
        var elmPos = $(this).offset().top;
        scroll = $(window).scrollTop();
        windowHeight = $(window).height();
        if (scroll > elmPos - windowHeight + 50){
            $(this).addClass('underlined');
        }
    });
});

document.addEventListener("DOMContentLoaded",() => {
    document.querySelectorAll(".details").forEach(function (el) {
        const summary = el.querySelector(".summary");
        const content = el.querySelector(".content");
        summary.addEventListener("click", (event) => {
            event.preventDefault();
            if (el.getAttribute("open")){
                const closingAnim = content.animate(closingAnimation(content),animTiming);
                closingAnim.onfinish = () => {
                    el.removeAttribute("open");
                };
            }
            else{
                el.setAttribute("open","true");
                const openingAnim = content.animate(openingAnimation(content),animTiming)
            }
        })
    });
});

const animTiming = {
    duration : 300,
    easing : "ease-in-out",
}

const closingAnimation = (answer) => [
    {
        height : answer.offsetheight + "px",
        opacity : 1,
    },
    {
        height : 0,
        opacity : 0,
    },
];
const openingAnimation = (answer) => [
    {
        height : 0,
        opacity : 0,
    },
    {
        height : answer.offsetheight + "px",
        opacity : 1,
    },
];