/*
 * Avable Color-Functions: "rgba", "rgb",  "lighter", "darker", "shade", "alpha", "mix"
 * see http://git.gnome.org/browse/gtk+/tree/gtk/gtkcsscolorvalue.c#n173
 */

(function (tree) {
var util = require('util');

/**
 * Converts an RGB color value to HSV. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and v in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSV representation
 */
function rgbToHsv(r, g, b){
    r = r/255, g = g/255, b = b/255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;

    var d = max - min;
    s = max == 0 ? 0 : d / max;

    if(max == min){
        h = 0; // achromatic
    }else{
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, v];
}


tree.functions = {
    rgb: function (r, g, b) {
        return this.rgba(r, g, b, 1.0);
    },
    rgba: function (r, g, b, a) {
        var rgb = [r, g, b].map(function (c) { return number(c); });
        a = number(a);
        return new(tree.Color)(rgb, a);
    },
    hsl: function (h, s, l) {
        return this.hsla(h, s, l, 1.0);
    },
    hsla: function (h, s, l, a) {
        h = (number(h) % 360) / 360;
        s = number(s); l = number(l); a = number(a);

        var m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
        var m1 = l * 2 - m2;

        return this.rgba(hue(h + 1/3) * 255,
                         hue(h)       * 255,
                         hue(h - 1/3) * 255,
                         a);

        function hue(h) {
            h = h < 0 ? h + 1 : (h > 1 ? h - 1 : h);
            if      (h * 6 < 1) return m1 + (m2 - m1) * h * 6;
            else if (h * 2 < 1) return m2;
            else if (h * 3 < 2) return m1 + (m2 - m1) * (2/3 - h) * 6;
            else                return m1;
        }
    },

    hsv: function(h, s, v) {
        return this.hsva(h, s, v, 1.0);
    },

    hsva: function(h, s, v, a) {
        h = ((number(h) % 360) / 360) * 360;
        s = number(s); v = number(v); a = number(a);

        var i, f;
        i = Math.floor((h / 60) % 6);
        f = (h / 60) - i;

        var vs = [v,
                  v * (1 - s),
                  v * (1 - f * s),
                  v * (1 - (1 - f) * s)];
        var perm = [[0, 3, 1],
                    [2, 0, 1],
                    [1, 0, 3],
                    [1, 2, 0],
                    [3, 1, 0],
                    [0, 1, 2]];

        return this.rgba(vs[perm[i][0]] * 255,
                         vs[perm[i][1]] * 255,
                         vs[perm[i][2]] * 255,
                         a);
    },

    hue: function (color) {
        return new(tree.Dimension)(Math.round(color.toHSL().h));
    },
    saturation: function (color) {
        return new(tree.Dimension)(Math.round(color.toHSL().s * 100), '%');
    },
    lightness: function (color) {
        return new(tree.Dimension)(Math.round(color.toHSL().l * 100), '%');
    },
    red: function (color) {
        return new(tree.Dimension)(color.rgb[0]);
    },
    green: function (color) {
        return new(tree.Dimension)(color.rgb[1]);
    },
    blue: function (color) {
        return new(tree.Dimension)(color.rgb[2]);
    },
    alpha: function (color) {
        return new(tree.Dimension)(color.toHSL().a);
    },
   /*
    * Modifies passed color's alpha by a factor f. f is a floating point number. f < 1.0 results in a more transparent color while f > 1.0 results in a more opaque color.
    * @amount: between 0 and 2
    *
    * gtk implementation: http://git.gnome.org/browse/gtk+/tree/gtk/gtkcsscolorvalue.c#n173
    */ 
    gtk_alpha: function (color, amount) {
        var hsl = color.toHSL();
        hsl.a = clamp(hsl.a*amount.value);
        return hsla(hsl);
    },
    luma: function (color) {
        return new(tree.Dimension)(Math.round((0.2126 * (color.rgb[0]/255) +
            0.7152 * (color.rgb[1]/255) +
            0.0722 * (color.rgb[2]/255)) *
            color.alpha * 100), '%');
    },
    saturate: function (color, amount) {
        var hsl = color.toHSL();

        hsl.s += amount.value / 100;
        hsl.s = clamp(hsl.s);
        return hsla(hsl);
    },
    desaturate: function (color, amount) {
        var hsl = color.toHSL();

        hsl.s -= amount.value / 100;
        hsl.s = clamp(hsl.s);
        return hsla(hsl);
    },
    lighten: function (color, amount) {
        var hsl = color.toHSL();

        hsl.l += amount.value / 100;
        hsl.l = clamp(hsl.l);
        return hsla(hsl);
    },
    darken: function (color, amount) {
        var hsl = color.toHSL();

        hsl.l -= amount.value / 100;
        hsl.l = clamp(hsl.l);
        return hsla(hsl);
    },
    shade: function(color, amount) {
        return this.mix(this.rgb(0, 0, 0), color, amount);
    },
  /*
   * shade(color, f) - A lighter or darker variant of color, f is a floating point number
   * "f" is the brightness that I described previously,but here it's between 0.0 and 2.0.
   *
   * If you set a color using one of the basic color keywords, say blue,
   * then on the next line use: shade(blue, 1.0) it will not change.
   * But if you set: shade(blue, 0.0) then you'll get black.
   * If you use: shade(blue, 2.0) you'll get white.
   *
   * colorspace: hsla
   *
   * gtk implementation:
   * http://git.gnome.org/browse/gtk+/tree/gtk/gtkcsscolorvalue.c#n173
   * http://git.gnome.org/browse/gtk+/tree/gtk/gtkhsla.c#n187
   * 
   * Tested! Fixme Round
   */
    gtk_shade: function(color, amount) {

        var hsl = color.toHSL();

        hsl.s = hsl.s * amount.value;
        hsl.l = hsl.l * amount.value;

        hsl.l = clamp(hsl.l);
        hsl.s = clamp(hsl.s);

        return hsla(hsl);
    },
    /*
     * return a color 10 percentage points *less* transparent than @color
     * @amount: between 0 and 1
     */
    fadein: function (color, amount) {
        var hsl = color.toHSL();

        hsl.a += amount.value / 100;
        hsl.a = clamp(hsl.a);
        return hsla(hsl);
    },
    /*
     * return a color 10 percentage points *more* transparent than @color
     * @amount: between 0 and 1
     */
    fadeout: function (color, amount) {
        var hsl = color.toHSL();

        hsl.a -= amount.value / 100;
        hsl.a = clamp(hsl.a);
        return hsla(hsl);
    },
    fade: function (color, amount) {
        var hsl = color.toHSL();

        hsl.a = amount.value / 100;
        hsl.a = clamp(hsl.a);
        return hsla(hsl);
    },
    spin: function (color, amount) {
        var hsl = color.toHSL();
        var hue = (hsl.h + amount.value) % 360;

        hsl.h = hue < 0 ? 360 + hue : hue;

        return hsla(hsl);
    },
    //
    // Copyright (c) 2006-2009 Hampton Catlin, Nathan Weizenbaum, and Chris Eppstein
    // http://sass-lang.com
    //
    mix: function (color1, color2, weight) {
        if (!weight) {
            weight = new(tree.Dimension)(50);
        }
        var p = weight.value / 100.0;
        var w = p * 2 - 1;
        var a = color1.toHSL().a - color2.toHSL().a;

        var w1 = (((w * a == -1) ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
        var w2 = 1 - w1;

        var rgb = [color1.rgb[0] * w1 + color2.rgb[0] * w2,
                   color1.rgb[1] * w1 + color2.rgb[1] * w2,
                   color1.rgb[2] * w1 + color2.rgb[2] * w2];

        var alpha = color1.alpha * p + color2.alpha * (1 - p);

        return new(tree.Color)(rgb, alpha);
    },
    /*
     * gtk implementation: http://git.gnome.org/browse/gtk+/tree/gtk/gtkcsscolorvalue.c#n215
     * 
     * tested
     */
    gtk_mix: function (color1, color2, weight) {

        var rgb = [color1.rgb[0] + ((color2.rgb[0] - color1.rgb[0]) * weight.value),
                   color1.rgb[1] + ((color2.rgb[1] - color1.rgb[1]) * weight.value),
                   color1.rgb[2] + ((color2.rgb[2] - color1.rgb[2]) * weight.value)];
        
        var alpha = color1.alpha + ((color2.alpha - color1.alpha) * weight.value)

        return new(tree.Color)(rgb, alpha);
    },
    greyscale: function (color) {
        return this.desaturate(color, new(tree.Dimension)(100));
    },
    contrast: function (color, dark, light, threshold) {
        if (typeof light === 'undefined') {
            light = this.rgba(255, 255, 255, 1.0);
        }
        if (typeof dark === 'undefined') {
            dark = this.rgba(0, 0, 0, 1.0);
        }
        if (typeof threshold === 'undefined') {
            threshold = 0.43;
        } else {
            threshold = threshold.value;
        }
        if (((0.2126 * (color.rgb[0]/255) + 0.7152 * (color.rgb[1]/255) + 0.0722 * (color.rgb[2]/255)) * color.alpha) < threshold) {
            return light;
        } else {
            return dark;
        }
    },
    e: function (str) {
        return new(tree.Anonymous)(str instanceof tree.JavaScript ? str.evaluated : str);
    },
    escape: function (str) {
        return new(tree.Anonymous)(encodeURI(str.value).replace(/=/g, "%3D").replace(/:/g, "%3A").replace(/#/g, "%23").replace(/;/g, "%3B").replace(/\(/g, "%28").replace(/\)/g, "%29"));
    },
    '%': function (quoted /* arg, arg, ...*/) {
        var args = Array.prototype.slice.call(arguments, 1),
            str = quoted.value;

        for (var i = 0; i < args.length; i++) {
            str = str.replace(/%[sda]/i, function(token) {
                var value = token.match(/s/i) ? args[i].value : args[i].toCSS();
                return token.match(/[A-Z]$/) ? encodeURIComponent(value) : value;
            });
        }
        str = str.replace(/%%/g, '%');
        return new(tree.Quoted)('"' + str + '"', str);
    },
    round: function (n, f) {
        var fraction = typeof(f) === "undefined" ? 0 : f.value;
        if (n instanceof tree.Dimension) {
            return new(tree.Dimension)(number(n).toFixed(fraction), n.unit);
        } else if (typeof(n) === 'number') {
            return n.toFixed(fraction);
        } else {
            throw { type: "Argument", message: "argument must be a number" };
        }
    },
    ceil: function (n) {
        return this._math('ceil', n);
    },
    floor: function (n) {
        return this._math('floor', n);
    },
    _math: function (fn, n) {
        if (n instanceof tree.Dimension) {
            return new(tree.Dimension)(Math[fn](number(n)), n.unit);
        } else if (typeof(n) === 'number') {
            return Math[fn](n);
        } else {
            throw { type: "Argument", message: "argument must be a number" };
        }
    },
    argb: function (color) {
        return new(tree.Anonymous)(color.toARGB());

    },
    percentage: function (n) {
        return new(tree.Dimension)(n.value * 100, '%');
    },
    color: function (n) {
        if (n instanceof tree.Quoted) {
            return new(tree.Color)(n.value.slice(1));
        } else {
            throw { type: "Argument", message: "argument must be a string" };
        }
    },
    iscolor: function (n) {
        return this._isa(n, tree.Color);
    },
    isnumber: function (n) {
        return this._isa(n, tree.Dimension);
    },
    isstring: function (n) {
        return this._isa(n, tree.Quoted);
    },
    iskeyword: function (n) {
        return this._isa(n, tree.Keyword);
    },
    isurl: function (n) {
        return this._isa(n, tree.URL);
    },
    ispixel: function (n) {
        return (n instanceof tree.Dimension) && n.unit === 'px' ? tree.True : tree.False;
    },
    ispercentage: function (n) {
        return (n instanceof tree.Dimension) && n.unit === '%' ? tree.True : tree.False;
    },
    isem: function (n) {
        return (n instanceof tree.Dimension) && n.unit === 'em' ? tree.True : tree.False;
    },
    _isa: function (n, Type) {
        return (n instanceof Type) ? tree.True : tree.False;
    },
    
    /* Blending modes */
    
    multiply: function(color1, color2) {
        var r = color1.rgb[0] * color2.rgb[0] / 255;
        var g = color1.rgb[1] * color2.rgb[1] / 255;
        var b = color1.rgb[2] * color2.rgb[2] / 255;
        return this.rgb(r, g, b);
    },
    screen: function(color1, color2) {
        var r = 255 - (255 - color1.rgb[0]) * (255 - color2.rgb[0]) / 255;
        var g = 255 - (255 - color1.rgb[1]) * (255 - color2.rgb[1]) / 255;
        var b = 255 - (255 - color1.rgb[2]) * (255 - color2.rgb[2]) / 255;
        return this.rgb(r, g, b);
    },
    overlay: function(color1, color2) {
        var r = color1.rgb[0] < 128 ? 2 * color1.rgb[0] * color2.rgb[0] / 255 : 255 - 2 * (255 - color1.rgb[0]) * (255 - color2.rgb[0]) / 255;
        var g = color1.rgb[1] < 128 ? 2 * color1.rgb[1] * color2.rgb[1] / 255 : 255 - 2 * (255 - color1.rgb[1]) * (255 - color2.rgb[1]) / 255;
        var b = color1.rgb[2] < 128 ? 2 * color1.rgb[2] * color2.rgb[2] / 255 : 255 - 2 * (255 - color1.rgb[2]) * (255 - color2.rgb[2]) / 255;
        return this.rgb(r, g, b);
    },
    softlight: function(color1, color2) {
        var t = color2.rgb[0] * color1.rgb[0] / 255;
        var r = t + color1.rgb[0] * (255 - (255 - color1.rgb[0]) * (255 - color2.rgb[0]) / 255 - t) / 255;
        t = color2.rgb[1] * color1.rgb[1] / 255;
        var g = t + color1.rgb[1] * (255 - (255 - color1.rgb[1]) * (255 - color2.rgb[1]) / 255 - t) / 255;
        t = color2.rgb[2] * color1.rgb[2] / 255;
        var b = t + color1.rgb[2] * (255 - (255 - color1.rgb[2]) * (255 - color2.rgb[2]) / 255 - t) / 255;
        return this.rgb(r, g, b);
    },
    hardlight: function(color1, color2) {
        var r = color2.rgb[0] < 128 ? 2 * color2.rgb[0] * color1.rgb[0] / 255 : 255 - 2 * (255 - color2.rgb[0]) * (255 - color1.rgb[0]) / 255;
        var g = color2.rgb[1] < 128 ? 2 * color2.rgb[1] * color1.rgb[1] / 255 : 255 - 2 * (255 - color2.rgb[1]) * (255 - color1.rgb[1]) / 255;
        var b = color2.rgb[2] < 128 ? 2 * color2.rgb[2] * color1.rgb[2] / 255 : 255 - 2 * (255 - color2.rgb[2]) * (255 - color1.rgb[2]) / 255;
        return this.rgb(r, g, b);
    },
    difference: function(color1, color2) {
        var r = Math.abs(color1.rgb[0] - color2.rgb[0]);
        var g = Math.abs(color1.rgb[1] - color2.rgb[1]);
        var b = Math.abs(color1.rgb[2] - color2.rgb[2]);
        return this.rgb(r, g, b);
    },
    exclusion: function(color1, color2) {
        var r = color1.rgb[0] + color2.rgb[0] * (255 - color1.rgb[0] - color1.rgb[0]) / 255;
        var g = color1.rgb[1] + color2.rgb[1] * (255 - color1.rgb[1] - color1.rgb[1]) / 255;
        var b = color1.rgb[2] + color2.rgb[2] * (255 - color1.rgb[2] - color1.rgb[2]) / 255;
        return this.rgb(r, g, b);
    },
    average: function(color1, color2) {
        var r = (color1.rgb[0] + color2.rgb[0]) / 2;
        var g = (color1.rgb[1] + color2.rgb[1]) / 2;
        var b = (color1.rgb[2] + color2.rgb[2]) / 2;
        return this.rgb(r, g, b);
    },
    negation: function(color1, color2) {
        var r = 255 - Math.abs(255 - color2.rgb[0] - color1.rgb[0]);
        var g = 255 - Math.abs(255 - color2.rgb[1] - color1.rgb[1]);
        var b = 255 - Math.abs(255 - color2.rgb[2] - color1.rgb[2]);
        return this.rgb(r, g, b);
    },
    tint: function(color, amount) {
        return this.mix(this.rgb(255,255,255), color, amount);
    },
    /*
     * gradient-function for cross-browser-gradient-support inspired by http://www.colorzilla.com/gradient-editor/
     * TODO support for diagonal and radial orientation
     */
    gtk_gradient: function(properity, type, from_position, to_position) {
        var css = "";
        var direction = "";
        type = type.value;

        if((from_position.value[0].value == 'left' && to_position.value[0].value == 'left') || (from_position.value[0].value == 'right' && to_position.value[0].value == 'right') )
            direction = "vertical";
        else
            direction = "horizontal";

        // console.log("");
        // console.log("type: "+util.inspect(type));
        // console.log("from_position: "+util.inspect(from_position));
        // console.log("to_position: "+util.inspect(to_position));
        // console.log("direction: "+direction);

        /* FF3.6+ (most like W3C)*/
        {
            //Workaround first property without background-image:
            css += "-moz-"+type+"-gradient(";
            switch(direction) {
                case "vertical":
                    css += " to bottom";
                break;
                case "horizontal":
                    css += " to right";
                break;
            }
            for(var i=4; i<arguments.length; i++) {
                css += ", "+arguments[i].color+" "+arguments[i].position;
            }
            css += ');'
        }
        css += '\n  ';
        /* Webkit: Chrome,Safari4+ */
        {
            css += properity.value+": -webkit-gradient(";
            css += type;
            switch(direction) {
                case "vertical":
                    css += ", left top, left bottom";
                break;
                case "horizontal":
                    css += ", left top, right top";
                break;
            }
            for(var i=4; i<arguments.length; i++) {
                css += ", color-stop("+arguments[i].position+","+arguments[i].color+")"
            }
            css += ');'
        }
        css += '\n  ';
        /* Chrome10+,Safari5.1+ (most like W3C)*/
        {
            css += properity.value+": -webkit-"+type+"-gradient(";
            switch(direction) {
                case "vertical":
                    css += " top";
                break;
                case "horizontal":
                    css += " left";
                break;
            }
            for(var i=4; i<arguments.length; i++) {
                css += ", "+arguments[i].color+" "+arguments[i].position;
            }
            css += ');'
        }
        css += '\n  ';
        /* Opera 11.10+ (most same W3C)*/
        {
            css += properity.value+": -o-"+type+"-gradient(";
            switch(direction) {
                case "vertical":
                    css += " top";
                break;
                case "horizontal":
                    css += " left";
                break;
            }
            for(var i=4; i<arguments.length; i++) {
                css += ", "+arguments[i].color+" "+arguments[i].position;
            }
            css += ');'
        }
        css += '\n  ';
        /* IE10+ (most like W3C)*/
        {
            css += properity.value+": -ms-"+type+"-gradient(";
            switch(direction) {
                case "vertical":
                    css += " top";
                break;
                case "horizontal":
                    css += " left";
                break;
            }
            for(var i=4; i<arguments.length; i++) {
                css += ", "+arguments[i].color+" "+arguments[i].position;
            }
            css += ');'
        }
        css += '\n  ';
        /* W3C */
        {
            css += properity.value+": "+type+"-gradient(";
            switch(direction) {
                case "vertical":
                    css += " top";
                break;
                case "horizontal":
                    css += " left";
                break;
            }
            for(var i=4; i<arguments.length; i++) {
                css += ", "+arguments[i].color+" "+arguments[i].position;
            }
            css += ');'
        }
        css += '\n  ';
        /* IE6-9 */
        if(properity.value == "background-image")
        {   
            css += "filter: progid:DXImageTransform.Microsoft.gradient( ";
            css += " startColorstr='"+arguments[4].color+"'"
            css += ", endColorstr='"+arguments[arguments.length-1].color+"'"

            switch(direction) {
                case "vertical":
                    css += ", GradientType=0";
                break;
                case "horizontal":
                    css += ", GradientType=1";
                break;
            }
            css += ')'
        }
        return {toCSS : function(){return css}};
    },
    /*
     * wrapper for gtk-gradient-functions to use in background_gradient
     */
    gtk_from: function (color) {
         return {position:'0%', color: color.toCSS()};
    },
    gtk_to: function (color) {
        return {position:'100%', color: color.toCSS()};
    },
    gtk_color_stop: function (position, color) {
        return {position:((position.value*100).toString()+'%'), color: color.toCSS()};
    }
};

function hsla(color) {
    return tree.functions.hsla(color.h, color.s, color.l, color.a);
}

function number(n) {
    if (n instanceof tree.Dimension) {
        return parseFloat(n.unit == '%' ? n.value / 100 : n.value);
    } else if (typeof(n) === 'number') {
        return n;
    } else {
        throw {
            error: "RuntimeError",
            message: "color functions take numbers as parameters"
        };
    }
}

function clamp(val) {
    return Math.min(1, Math.max(0, val));
}

})(require('./tree'));
