$('.chevron').click(function(){
    if($(this).children().hasClass('fa-chevron-down')) {
        $(this).siblings('.desc').removeClass('hide');
        $(this).children('.fa-chevron-down')
               .removeClass('fa-chevron-down')
               .addClass('fa-chevron-up');
    } else {
        $(this).siblings('.desc').addClass('hide');
        $(this).children('.fa-chevron-up')
               .removeClass('fa-chevron-up')
               .addClass('fa-chevron-down');
    }
});
