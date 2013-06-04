$(document).ready(function() {

	$(".chzn-select").chosen({disable_search_threshold: 100});

	// ---------------- -------------------- //
	    $(".js-accord-body").hide();
	    $(".js-accord-body1").show();
	    $(".js-accord").click(function(){
	        if ($(this).hasClass("is-active")) {
	            $(this).removeClass("is-active");
	            $(this).next().slideUp("fast");
	        }
	        else{
	            // $(".js-accord-body").slideUp("fast");
	            // $(".js-accord").removeClass("is-active");
	            $(this).addClass("is-active");
	            $(this).next().slideDown("fast");
	        }
	    });

	     $(".account__list li").not('.account__more').click(function(){
	          $(this).toggleClass('is-selected');
	          return false;
	    });

	// ---------------- -------------------- //
		$('.account__rate-num .more').click(function(){
			var count = parseInt($(this).next('input').val());
			if (count < 1) {$(this).next('input').val(1);}
			else {$(this).next('input').val(count+1);}
			return false;
		});

		$('.account__rate-num .less').click(function(){
			var count = parseInt($(this).prev('input').val());
			if (count <= 1) {$(this).next('input').val(1);}
			else {$(this).prev('input').val(count-1);}
			return false;
		});

	// ----------------  -------------------- //
	    $('.btn_primary').click(function() {
	     if ($(this).hasClass('is-active')) {
	      $(this).removeClass('is-active');
	      $('.js-check').fadeOut();
	     }
	     else {
	      $(this).addClass('is-active');
	      $('.js-check').fadeIn();
	     }
	     return false;
	    });

	// ----------------  -------------------- //
	    $('.js-evaluation').click(function() {
	     if ($(this).hasClass('is-active')) {
	      $(this).removeClass('is-active');
	      $(this).next('.js-evaluation-info').fadeOut();
	     }
	     else {
	      $(this).addClass('is-active');
	      $(this).next('.js-evaluation-info').fadeIn();
	     }
	     return false;
	    });

	// ----------------  -------------------- //
	    $('.js-auth').click(function() {
	     if ($(this).hasClass('is-open')) {
	      $(".js-auth").removeClass('is-open');
	      $(".js-popups").fadeOut();
	     }
	     else {
	      $(".js-auth").removeClass('is-open');
	      $(this).addClass('is-open');
	      $(".js-popups").fadeOut();
	      $(this).next().fadeIn();
	     }
	     return false;
	    });
});
