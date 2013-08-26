
	$('.js-accord-body').hide();
	$('.js-accord-body1').show();

	$('.js-accord').click(function() {
		var	_this = $(this);
		
		_this
			.toggleClass('is-active')
			.next()
			[_this.hasClass('is-active') ? 'slideDown' : 'slideUp']('fast');
	});

	$('.account__list li')
		.not('.account__more')
		.click(function() {
			$(this).toggleClass('is-selected');
			return false;
		});