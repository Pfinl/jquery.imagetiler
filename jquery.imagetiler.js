(function ($) {
    "use strict"

    var ImageTiler = {

        init: function (args) {
            var options = $.extend({}, $.fn.imageTiler.defaults, args || {});

            function positionImages($container, images, index) {
                var margin = options.margin,
                    wrapperWidthPercentage = (100 - (margin * images.length)) / images.length, //wrapper width precentage
                    wrapperWidth = ($container.width() * wrapperWidthPercentage) / 100, //actual wrapper width
                    height = options.maxRowHeight,
                    top = 0,
                    leftOffset = 0,
                    imgWidth,
                    i = 0,
                    img,
                    explicitHeight,
                    newHeight,
                    wrapper = null;

                for (; i < images.length; i++) {
                    img = $(images[i]);
                    if (options.wrapperClass !== null && typeof options.wrapperClass === 'string') {
                        wrapper = img.closest('.' + options.wrapperClass);
                    }

                    if (wrapper === null || !wrapper.length) {
                        img.wrap($('<div/>'));
                        wrapper = img.closest('div');
                        if (options.wrapperClass !== null && typeof options.wrapperClass === 'string') {
                            wrapper.addClass(options.wrapperClass);
                        }
                    }

                    explicitHeight = parseInt(wrapper.css('max-height'));
                    if (!isNaN(explicitHeight)) {
                        height = explicitHeight;
                    }
                    top = (height * index) + (index * (margin * 2));

                    wrapper.css({ 'width': wrapperWidthPercentage + '%', 'height': height + 'px', 'position': 'absolute', 'top': top + 'px', 'left': (wrapperWidthPercentage * i) + (i * margin) + '%', 'overflow': 'hidden', 'text-align': 'center' });
                    img.css({ 'height': '100%', 'max-width': 'none', 'border': 0, 'position': 'relative' });

                    //try to center the image
                    imgWidth = img.width();
                    if (imgWidth > wrapperWidth && images.length > 1) {
                        img.css({ 'left': -((imgWidth - wrapperWidth) / 2) + 'px' });
                    }
                }

                newHeight = (height * (index + 1)) + (index * (margin * 2));
                //console.log(newHeight);
                //set height of container to account for absolutely positioned children
                $container.css('height', newHeight + 'px');
            }

            function layitOut($container, allImages) {
                var containerWidth = $container.width(), slice;
                $container.show(); //make sure to show the container

                function splitLayout(images, index) {
                    if (!images.length) { return; }

                    if (images.length <= options.maxImagesInRow) {
                        positionImages($container, images, index);
                    }

                    //get next set of maxImagesInRow and lay it out
                    slice = allImages.splice(0, Math.min(allImages.length, options.maxImagesInRow));
                    splitLayout(slice, index + 1);
                }

                //if it's just one image, don't do anything
                if (allImages.length > 1) {
                    //if it's not divisible by the maxImagesInRow, put widest images last 
                    if (allImages.length % options.maxImagesInRow > 0) {
                        allImages.sort(function (a, b) {
                            var aw = a.offsetWidth, bw = b.offsetWidth;
                            if (aw > bw) {
                                return 1;
                            }
                            if (aw < bw) {
                                return -1;
                            }
                            return 0;
                        });
                    }
                    //get first maxImagesInRow and lay it out
                    slice = allImages.splice(0, Math.min(allImages.length, options.maxImagesInRow));
                    splitLayout(slice, 0);
                }
            }

            return this.each(function () {
                var $this = $(this);
                $this.css({ 'position': 'relative' }).hide();

                function render($container) {
                    var allImages = $container.find('img');
                    if (allImages.length) {
                        layitOut($container, allImages);
                        if (typeof options.renderComplete === 'function') options.renderComplete();
                    }
                }

                if ($this.data('ng.imgsLoaded') !== true) {
                    $this.imagesLoaded(function () {
                        render($this);
                        $this.data('ng.imgsLoaded', true);
                    });
                }
                else {
                    render($this);
                }


            });
        },

        reset: function (args) {
            ImageTiler.init.call(this, args);
        }
    }

    $.fn.imageTiler = function (method) {
        // Method calling logic
        if (typeof ImageTiler[method] === 'function') {
            return ImageTiler[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return ImageTiler.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.ImageTiler');
        }

        return this;
    };

    $.fn.imageTiler.defaults = {
        maxImagesInRow: 4,
        margin: 2,
        wrapperClass: null,
        maxRowHeight: 150,
        renderComplete: $.noop
    };
    
    //I cannot take credit for this code.  This came from another plugin that I used in the past, but can't find the source or who to give credit to!!
    // blank image data-uri bypasses webkit log warning (thx doug jones)
    var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

    $.fn.imagesLoaded = function (callback) {
        var $this = this,
        deferred = $.isFunction($.Deferred) ? $.Deferred() : 0,
        hasNotify = $.isFunction(deferred.notify),
        $images = $this.find('img').add($this.filter('img')),
        loaded = [],
        proper = [],
        broken = [];

        // Register deferred callbacks
        if ($.isPlainObject(callback)) {
            $.each(callback, function (key, value) {
                if (key === 'callback') {
                    callback = value;
                } else if (deferred) {
                    deferred[key](value);
                }
            });
        }

        function doneLoading() {
            var $proper = $(proper),
            $broken = $(broken);

            if (deferred) {
                if (broken.length) {
                    deferred.reject($images, $proper, $broken);
                } else {
                    deferred.resolve($images);
                }
            }

            if ($.isFunction(callback)) {
                callback.call($this, $images, $proper, $broken);
            }
        }

        function imgLoadedHandler(event) {
            imgLoaded(event.target, event.type === 'error');
        }

        function imgLoaded(img, isBroken) {
            // don't proceed if BLANK image, or image is already loaded
            if (img.src === BLANK || $.inArray(img, loaded) !== -1) {
                return;
            }

            // store element in loaded images array
            loaded.push(img);

            // keep track of broken and properly loaded images
            if (isBroken) {
                broken.push(img);
            } else {
                proper.push(img);
            }

            // cache image and its state for future calls
            $.data(img, 'imagesLoaded', { isBroken: isBroken, src: img.src });

            // trigger deferred progress method if present
            if (hasNotify) {
                deferred.notifyWith($(img), [isBroken, $images, $(proper), $(broken)]);
            }

            // call doneLoading and clean listeners if all images are loaded
            if ($images.length === loaded.length) {
                setTimeout(doneLoading);
                $images.unbind('.imagesLoaded', imgLoadedHandler);
            }
        }

        // if no images, trigger immediately
        if (!$images.length) {
            doneLoading();
        } else {
            $images.bind('load.imagesLoaded error.imagesLoaded', imgLoadedHandler)
        .each(function (i, el) {
            var src = el.src;

            // find out if this image has been already checked for status
            // if it was, and src has not changed, call imgLoaded on it
            var cached = $.data(el, 'imagesLoaded');
            if (cached && cached.src === src) {
                imgLoaded(el, cached.isBroken);
                return;
            }

            // if complete is true and browser supports natural sizes, try
            // to check for image status manually
            if (el.complete && el.naturalWidth !== undefined) {
                imgLoaded(el, el.naturalWidth === 0 || el.naturalHeight === 0);
                return;
            }

            // cached images don't fire load sometimes, so we reset src, but only when
            // dealing with IE, or image is complete (loaded) and failed manual check
            // webkit hack from http://groups.google.com/group/jquery-dev/browse_thread/thread/eee6ab7b2da50e1f
            if (el.readyState || el.complete) {
                el.src = BLANK;
                el.src = src;
            }
        });
        }

        return deferred ? deferred.promise($this) : $this;
    };

})(jQuery);
