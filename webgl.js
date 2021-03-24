/*--------------------------------------------------------------
>>> WEBGL
----------------------------------------------------------------
# Global variable
# Color
# Resize
# Set target
# Buffer
# Shader
# Create plane
# Render
--------------------------------------------------------------*/

/*--------------------------------------------------------------
# GLOBAL VARIABLE
--------------------------------------------------------------*/

var WEBGL = {
    canvas: false,
    context: false,
    children: []
};


/*--------------------------------------------------------------
# COLOR
--------------------------------------------------------------*/

WEBGL.color = function(value) {
    if (typeof value === 'number') {
        return [
            (value >> 16 & 255) / 255,
            (value >> 8 & 255) / 255,
            (value & 255) / 255,
            1
        ];
    } else {
        return false;
    }
};


/*--------------------------------------------------------------
# RESIZE
--------------------------------------------------------------*/

WEBGL.resize = function() {
    var cvs = WEBGL.canvas,
        ctx = WEBGL.context;

    cvs.width = cvs.offsetWidth;
    cvs.height = cvs.offsetHeight;

    ctx.viewport(0, 0, cvs.width, cvs.height);
};


/*--------------------------------------------------------------
# SET TARGET
--------------------------------------------------------------*/

WEBGL.setCanvas = function(element) {
    this.canvas = element;

    this.context = this.canvas.getContext('webgl', {
        alpha: false,
        antialias: true,
        depth: true,
        desynchronized: false,
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'default',
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        stencil: false
    });

    this.resize();

    window.removeEventListener('resize', WEBGL.resize);
    window.addEventListener('resize', WEBGL.resize);

    var ctx = this.context;

    ctx.clearColor(0, 0, 0, 0);
    ctx.clearDepth(1);
    ctx.enable(ctx.BLEND);
    ctx.enable(ctx.DEPTH_TEST);
    ctx.depthFunc(ctx.LEQUAL);
    ctx.blendFunc(ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA);

    this.render();
};


/*--------------------------------------------------------------
# BUFFER
--------------------------------------------------------------*/

WEBGL.createBuffer = function(array) {
    var ctx = this.context,
        buffer = ctx.createBuffer();

    ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(array), ctx.STATIC_DRAW);
}


/*--------------------------------------------------------------
# SHADER
--------------------------------------------------------------*/

WEBGL.createShader = function(type, source) {
    var ctx = this.context,
        shader = ctx.createShader(type);

    ctx.shaderSource(shader, source);
    ctx.compileShader(shader);

    return shader;
};

WEBGL.createProgram = function(vertex_shader_source, fragment_shader_source) {
    var ctx = this.context,
        program = ctx.createProgram(),
        vertex_shader = this.createShader(ctx.VERTEX_SHADER, vertex_shader_source),
        fragment_shader = this.createShader(ctx.FRAGMENT_SHADER, fragment_shader_source);

    ctx.attachShader(program, vertex_shader);
    ctx.attachShader(program, fragment_shader);

    ctx.linkProgram(program);

    return program;
};


/*--------------------------------------------------------------
# CREATE PLANE
--------------------------------------------------------------*/

WEBGL.createElement = function(name, styles) {
    if (!this.canvas) {
        var cvs = document.querySelector('canvas');

        if (cvs) {
            this.setCanvas(cvs);
        } else {
            console.error('No <canvas>');

            return false;
        }
    }

    var ctx = this.context,
        element = {
            name: name,
            positionBuffer: ctx.createBuffer(),
            program: null,
            style: {
                cache: {
                    left: 0,
                    top: 0,
                    width: 1,
                    height: 1,
                    backgroundColor: 0x000000,
                    rotation: 0,
                    scale: [1, 1]
                },
                set left(value) {
                    this.cache.left = value;
                },
                get left() {
                    return this.cache.left;
                },
                set top(value) {
                    this.cache.top = value;
                },
                get top() {
                    return this.cache.top;
                },
                set width(value) {
                    this.cache.width = value;
                },
                get width() {
                    return this.cache.width;
                },
                set height(value) {
                    this.cache.height = value;
                },
                get height() {
                    return this.cache.height;
                },
                set backgroundColor(value) {
                    this.cache.backgroundColor = value;
                },
                get backgroundColor() {
                    return this.cache.backgroundColor;
                }
            },
            remove: function() {
                WEBGL.context.deleteBuffer(this.positionBuffer);
                WEBGL.context.deleteProgram(this.program);

                WEBGL.children.splice(this.id, 1);
            }
        };

    element.program = this.createProgram(
        `attribute vec2 a_position;
    
        uniform vec2 u_resolution;
        uniform vec2 u_translation;
        uniform vec2 u_rotation;
        uniform vec2 u_scale;

        void main(void) {
            vec2 scaledPosition = a_position * u_scale;
            
            vec2 rotatedPosition = vec2(
                scaledPosition.x * u_rotation.y + scaledPosition.y * u_rotation.x,
                scaledPosition.y * u_rotation.y - scaledPosition.x * u_rotation.x
            );
            
            vec2 position = rotatedPosition + u_translation;
            vec2 zeroToOne = position / u_resolution;
            vec2 zeroToTwo = zeroToOne * 2.0;
            vec2 clipSpace = zeroToTwo - 1.0;
            
            gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        }`,
        `precision mediump float;

        uniform vec4 u_background_color;

        void main() {
            gl_FragColor = u_background_color;
        }`
    );

    element.uniforms = {
        a_position: ctx.getAttribLocation(element.program, 'a_position'),
        u_resolution: ctx.getUniformLocation(element.program, 'u_resolution'),
        u_translation: ctx.getUniformLocation(element.program, 'u_translation'),
        u_rotation: ctx.getUniformLocation(element.program, 'u_rotation'),
        u_scale: ctx.getUniformLocation(element.program, 'u_scale'),
        u_background_color: ctx.getUniformLocation(element.program, 'u_background_color')
    };

    for (var key in styles) {
        if (
            key === 'left' ||
            key === 'top' ||
            key === 'width' ||
            key === 'height' ||
            key === 'backgroundColor'
        ) {
            element.style.cache[key] = styles[key];
        }
    }

    this.children.push(element);

    ctx.useProgram(element.program);
    ctx.uniform2f(element.uniforms.u_resolution, this.canvas.width, this.canvas.height);

    return element;
};


/*--------------------------------------------------------------
# RENDER
--------------------------------------------------------------*/

WEBGL.render = function() {
    var ctx = WEBGL.context;

    ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);

    for (var i = 0, l = WEBGL.children.length; i < l; i++) {
        var child = WEBGL.children[i],
            x1 = 0,
            x2 = child.style.cache.width,
            y1 = 0,
            y2 = child.style.cache.height,
            radians = child.style.cache.rotation * Math.PI / 180;

        ctx.useProgram(child.program);

        ctx.uniform2fv(child.uniforms.u_translation, [child.style.cache.left, child.style.cache.top]);
        ctx.uniform2fv(child.uniforms.u_rotation, [Math.sin(radians), Math.cos(radians)]);
        ctx.uniform2fv(child.uniforms.u_scale, child.style.cache.scale);

        ctx.uniform4fv(child.uniforms.u_background_color, WEBGL.color(child.style.cache.backgroundColor));

        ctx.bindBuffer(ctx.ARRAY_BUFFER, child.positionBuffer);
        ctx.enableVertexAttribArray(child.uniforms.a_position);
        ctx.vertexAttribPointer(child.uniforms.a_position, 2, ctx.FLOAT, false, 0, 0);

        ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([
            x1, y1,
            x2, y1,
            x1, y2,
            x1, y2,
            x2, y1,
            x2, y2
        ]), ctx.STATIC_DRAW);

        ctx.drawArrays(ctx.TRIANGLES, 0, 6);
    }

    requestAnimationFrame(WEBGL.render);
};