# webgl.js
Manipulate WebGL in the same way as the DOM.


### Usage

```html
<!doctype html>
<html>
    <head>...</head>
    <body>
        <canvas></canvas>

    	<script src="webgl.js"></script>
    	<script>
    	    var element = WEBGL.createElement('plane');

    	    element.style.width = 100;
    	    element.style.height = 100;
    	    element.style.backgroundColor = 0xFFFFFF;
    	</script>
    </body>
</html>
```


### Styles

- [x] left
- [x] top
- [x] width
- [x] height
- [x] background-color
