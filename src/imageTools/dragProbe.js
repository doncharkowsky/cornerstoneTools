(function($, cornerstone, cornerstoneTools) {

    'use strict';

    function defaultStrategy(eventData) {
        var enabledElement = cornerstone.getEnabledElement(eventData.element);

        cornerstone.updateImage(eventData.element);

        var context = enabledElement.canvas.getContext('2d');
        context.setTransform(1, 0, 0, 1, 0, 0);

        var color = cornerstoneTools.toolColors.getActiveColor();
        var font = cornerstoneTools.textStyle.getFont();
        var fontHeight = cornerstoneTools.textStyle.getFontSize();
        var config = cornerstoneTools.dragProbe.getConfiguration();

        context.save();

        if (config && config.shadow) {
            context.shadowColor = config.shadowColor || '#000000';
            context.shadowOffsetX = config.shadowOffsetX || 1;
            context.shadowOffsetY = config.shadowOffsetY || 1;
        }

        var x = Math.round(eventData.currentPoints.image.x);
        var y = Math.round(eventData.currentPoints.image.y);

        var storedPixels;
        var text,
            str;

        if (x < 0 || y < 0 || x >= eventData.image.columns || y >= eventData.image.rows) {
            return;
        }

        if (eventData.image.color) {
            storedPixels = cornerstoneTools.getRGBPixels(eventData.element, x, y, 1, 1);
            text = '' + x + ', ' + y;
            str = 'R: ' + storedPixels[0] + ' G: ' + storedPixels[1] + ' B: ' + storedPixels[2] + ' A: ' + storedPixels[3];
        } else {
            storedPixels = cornerstone.getStoredPixels(eventData.element, x, y, 1, 1);
            var sp = storedPixels[0];
            var mo = sp * eventData.image.slope + eventData.image.intercept;
            var suv = cornerstoneTools.calculateSUV(eventData.image, sp);

            // Draw text
            text = '' + x + ', ' + y;
            str = 'SP: ' + sp + ' MO: ' + parseFloat(mo.toFixed(3));
            if (suv) {
                str += ' SUV: ' + parseFloat(suv.toFixed(3));
            }
        }

        // Draw text
        var coords = {
            // translate the x/y away from the cursor
            x: eventData.currentPoints.image.x + 3,
            y: eventData.currentPoints.image.y - 3
        };
        var textCoords = cornerstone.pixelToCanvas(eventData.element, coords);
        
        context.font = font;
        context.fillStyle = color;

        cornerstoneTools.drawTextBox(context, str, textCoords.x, textCoords.y + fontHeight + 5, color);
        cornerstoneTools.drawTextBox(context, text, textCoords.x, textCoords.y, color);
        context.restore();
    }

    function minimalStrategy(eventData) {
        var element = eventData.element;
        var enabledElement = cornerstone.getEnabledElement(element);
        var image = enabledElement.image;

        cornerstone.updateImage(element);

        var context = enabledElement.canvas.getContext('2d');
        context.setTransform(1, 0, 0, 1, 0, 0);

        var color = cornerstoneTools.toolColors.getActiveColor();
        var font = cornerstoneTools.textStyle.getFont();
        var config = cornerstoneTools.dragProbe.getConfiguration();
        
        context.save();

        if (config && config.shadow) {
            context.shadowColor = config.shadowColor || '#000000';
            context.shadowOffsetX = config.shadowOffsetX || 1;
            context.shadowOffsetY = config.shadowOffsetY || 1;
        }

        var toolCoords;
        if (eventData.isTouchEvent === true) {
            toolCoords = cornerstone.pageToPixel(element, eventData.currentPoints.page.x,
                eventData.currentPoints.page.y - cornerstoneTools.textStyle.getFontSize() * 4);
        } else {
            toolCoords = eventData.currentPoints.image;
        }

        var storedPixels;
        var text;

        if (toolCoords.x < 0 || toolCoords.y < 0 ||
            toolCoords.x >= image.columns || toolCoords.y >= image.rows) {
            return;
        }
        
        if (image.color) {
            storedPixels = cornerstone.getStoredPixels(element, toolCoords.x, toolCoords.y, 3, 1);
            text = 'R: ' + storedPixels[0] + ' G: ' + storedPixels[1] + ' B: ' + storedPixels[2];
        } else {
            storedPixels = cornerstone.getStoredPixels(element, toolCoords.x, toolCoords.y, 1, 1);
            var huValue = storedPixels[0] * image.slope + image.intercept;
            text = parseFloat(huValue.toFixed(3));
        }

        // Prepare text
        var textCoords = cornerstone.pixelToCanvas(element, toolCoords);
        context.font = font;
        context.fillStyle = color;

        // Translate the x/y away from the cursor
        var translation;
        if (eventData.isTouchEvent === true) {
            var width = context.measureText(text).width;
            translation = {
                x: -width / 2 - 5,
                y: -cornerstoneTools.textStyle.getFontSize() * 1.5
            };

            var handleRadius = 6;

            context.beginPath();
            context.strokeStyle = color;
            context.arc(textCoords.x, textCoords.y, handleRadius, 0, 2 * Math.PI);
            context.stroke();
        } else {
            translation = {
                x: 4,
                y: -4
            };
        }

        cornerstoneTools.drawTextBox(context, text, textCoords.x + translation.x, textCoords.y + translation.y, color);
        context.restore();
    }

    function mouseUpCallback(e, eventData) {
        $(eventData.element).off('CornerstoneToolsMouseDrag', dragCallback);
        $(eventData.element).off('CornerstoneToolsMouseUp', mouseUpCallback);
        cornerstone.updateImage(eventData.element);
    }

    function mouseDownCallback(e, eventData) {
        if (cornerstoneTools.isMouseButtonEnabled(eventData.which, e.data.mouseButtonMask)) {
            $(eventData.element).on('CornerstoneToolsMouseDrag', dragCallback);
            $(eventData.element).on('CornerstoneToolsMouseUp', mouseUpCallback);
            cornerstoneTools.dragProbe.strategy(eventData);
            return false; // false = causes jquery to preventDefault() and stopPropagation() this event
        }
    }

    function dragCallback(e, eventData) {
        cornerstoneTools.dragProbe.strategy(eventData);
        return false; // false = causes jquery to preventDefault() and stopPropagation() this event
    }

    cornerstoneTools.dragProbe = cornerstoneTools.simpleMouseButtonTool(mouseDownCallback);
    
    cornerstoneTools.dragProbe.strategies = {
        default: defaultStrategy,
        minimal: minimalStrategy
    };
    cornerstoneTools.dragProbe.strategy = defaultStrategy;

    var options = {
        fireOnTouchStart: true
    };
    cornerstoneTools.dragProbeTouch = cornerstoneTools.touchDragTool(dragCallback, options);

})($, cornerstone, cornerstoneTools);
