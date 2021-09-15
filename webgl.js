/*--------------------------------------------------------------
>>> WEBGL
----------------------------------------------------------------
# Global variable
# Color
# Resize
# Set target
# Buffer
# Shader
# Styles
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

WEBGL.color = function (value) {
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

WEBGL.resize = function () {
    var cvs = WEBGL.canvas,
        ctx = WEBGL.context;

    cvs.width = cvs.offsetWidth;
    cvs.height = cvs.offsetHeight;

    ctx.viewport(0, 0, cvs.width, cvs.height);
};


/*--------------------------------------------------------------
# SET TARGET
--------------------------------------------------------------*/

WEBGL.setCanvas = function (element) {
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

WEBGL.createBuffer = function (array) {
    var ctx = this.context,
        buffer = ctx.createBuffer();

    ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(array), ctx.STATIC_DRAW);
}


/*--------------------------------------------------------------
# SHADER
--------------------------------------------------------------*/

WEBGL.createShader = function (type, source) {
    var ctx = this.context,
        shader = ctx.createShader(type);

    ctx.shaderSource(shader, source);
    ctx.compileShader(shader);

    return shader;
};

WEBGL.createProgram = function (vertex_shader_source, fragment_shader_source) {
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
# STYLES
--------------------------------------------------------------*/

WEBGL.createStyle = function (target) {
    var child = target,
        style = {
            left: 0,
            top: 0,
            width: 1,
            height: 1,
            backgroundColor: 0x000000,
            backgroundImage: null,
            rotation: 0,
            scale: [1, 1]
        };

    return {
        set left(value) {
            style.left = value;
        },
        get left() {
            return style.left;
        },
        set top(value) {
            style.top = value;
        },
        get top() {
            return style.top;
        },
        set width(value) {
            style.width = value;
        },
        get width() {
            return style.width;
        },
        set height(value) {
            style.height = value;
        },
        get height() {
            return style.height;
        },
        set backgroundColor(value) {
            style.backgroundColor = value;
        },
        get backgroundColor() {
            return style.backgroundColor;
        },
        set backgroundImage(value) {
            style.backgroundImage = value;

            if (value !== null) {
                var ctx = WEBGL.context,
                    image = new Image();

                child.textureBuffer = ctx.createBuffer();
                child.texture = ctx.createTexture();

                ctx.bindBuffer(ctx.ARRAY_BUFFER, child.textureBuffer);

                ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([
                    0, 0,
                    1, 0,
                    0, 1,
                    0, 1,
                    1, 0,
                    1, 1
                ]), ctx.STATIC_DRAW);

                child.uniforms.a_texcoord = ctx.getAttribLocation(child.program, 'a_texcoord');
                child.uniforms.u_texture = ctx.getUniformLocation(child.program, 'u_texture');

                ctx.bindTexture(ctx.TEXTURE_2D, child.texture);
                ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, 1, 1, 0, ctx.RGBA, ctx.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

                image.src = value;
                image.addEventListener('load', function () {
                    ctx.bindTexture(ctx.TEXTURE_2D, child.texture);
                    ctx.texImage2D(
                        ctx.TEXTURE_2D,
                        0,
                        ctx.RGBA,
                        ctx.RGBA,
                        ctx.UNSIGNED_BYTE,
                        image
                    );
                    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
                    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
                    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST);
                    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST);
                });
            }

            updateProgram(child);
        },
        get backgroundImage() {
            return style.backgroundImage;
        },
        set scale(value) {
            style.scale = value;
        },
        get scale() {
            return style.scale;
        },
        set rotation(value) {
            style.rotation = value;
        },
        get rotation() {
            return style.rotation;
        }
    };
};


/*--------------------------------------------------------------
# CREATE PLANE
--------------------------------------------------------------*/

WEBGL.createElement = function (name, styles) {
    if (!this.canvas) {
        var cvs = document.querySelector('canvas');

        if (cvs) {
            this.setCanvas(cvs);
        } else {
            console.error('No <canvas>');

            return false;
        }
    }

    function updateProgram(element) {
        var vertex_shader = `attribute vec2 a_position;
            attribute vec2 a_texcoord;
    
            uniform vec2 u_resolution;
            uniform vec2 u_translation;
            uniform vec2 u_rotation;
            uniform vec2 u_scale;
            varying vec2 v_texcoord;

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

                v_texcoord = a_texcoord;
            }`,
            fragment_shader;

        if (element.style.backgroundImage === null) {
            fragment_shader = `precision mediump float;

            uniform vec4 u_background_color;

            void main() {
                gl_FragColor = u_background_color;
            }`;
        } else {
            fragment_shader = `precision mediump float;

            varying vec2 v_texcoord;

            uniform sampler2D u_texture;

            void main() {
                gl_FragColor = texture2D(u_texture, v_texcoord);

                gl_FragColor.rgb *= gl_FragColor.a;
            }`;
        }

        element.program = WEBGL.createProgram(vertex_shader, fragment_shader);

        WEBGL.context.useProgram(element.program);
    }

    var ctx = this.context,
        element = {
            name: name,
            positionBuffer: ctx.createBuffer(),
            textureBuffer: ctx.createBuffer(),
            texture: null,
            program: null,
            remove: function () {
                WEBGL.context.deleteBuffer(this.positionBuffer);
                WEBGL.context.deleteProgram(this.program);

                WEBGL.children.splice(this.id, 1);
            }
        };

    element.style = new WEBGL.createStyle(element);

    updateProgram(element);

    element.uniforms = {
        a_position: ctx.getAttribLocation(element.program, 'a_position'),
        a_texcoord: ctx.getUniformLocation(element.program, 'a_texcoord'),
        u_resolution: ctx.getUniformLocation(element.program, 'u_resolution'),
        u_translation: ctx.getUniformLocation(element.program, 'u_translation'),
        u_rotation: ctx.getUniformLocation(element.program, 'u_rotation'),
        u_scale: ctx.getUniformLocation(element.program, 'u_scale'),
        u_background_color: ctx.getUniformLocation(element.program, 'u_background_color'),
        u_texture: ctx.getUniformLocation(element.program, 'u_texture')
    };

    this.children.push(element);

    ctx.uniform2f(element.uniforms.u_resolution, this.canvas.width, this.canvas.height);

    return element;
};


/*--------------------------------------------------------------
# RENDER
--------------------------------------------------------------*/

WEBGL.render = function () {
    var cvs = WEBGL.canvas,
        ctx = WEBGL.context;

    ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);

    for (var i = 0, l = WEBGL.children.length; i < l; i++) {
        var child = WEBGL.children[i],
            x1 = 0,
            x2 = child.style.width,
            y1 = 0,
            y2 = child.style.height,
            radians = child.style.rotation * Math.PI / 180;

        ctx.useProgram(child.program);

        ctx.uniform2f(child.uniforms.u_resolution, cvs.width, cvs.height);

        ctx.uniform2fv(child.uniforms.u_translation, [child.style.left, child.style.top]);
        ctx.uniform2fv(child.uniforms.u_rotation, [Math.sin(radians), Math.cos(radians)]);
        ctx.uniform2fv(child.uniforms.u_scale, child.style.scale);

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

        if (child.style.backgroundImage !== null) {
            ctx.bindTexture(ctx.TEXTURE_2D, child.texture);
            ctx.bindBuffer(ctx.ARRAY_BUFFER, child.textureBuffer);
            ctx.enableVertexAttribArray(child.uniforms.a_texcoord);
            ctx.vertexAttribPointer(child.uniforms.a_texcoord, 2, ctx.FLOAT, false, 0, 0);
            ctx.uniform1i(child.uniforms.u_texture, 0);
        } else {
            ctx.uniform4fv(child.uniforms.u_background_color, WEBGL.color(child.style.backgroundColor));
        }

        ctx.drawArrays(ctx.TRIANGLES, 0, 6);
    }

    requestAnimationFrame(WEBGL.render);
};