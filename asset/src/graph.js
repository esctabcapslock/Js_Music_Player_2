var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
//컴파일: tsc --lib 'es6,dom' --downlevelIteration  ./asset/src/graph.ts
var Graph = /** @class */ (function () {
    function Graph(dom, xlabel, ylabel, type, scale_spacing) {
        this.xlabel = '';
        this.x_is_time = false;
        this.ylabel = '';
        this.data_labels = [];
        this.label_len_max = 30;
        this.data_show = [];
        this.data_color = [];
        //protected visual:boolean[] = []
        this.width = 200;
        this.height = 200;
        this.dataheight = 40;
        this.xmin = 0;
        this.xmax = 1;
        this.ymin = 0;
        this.ymax = 1;
        this.x_data = [];
        this.y_datas = [];
        this.type = '';
        this.scale_spacing = 50; //픽셀단위
        if (typeof scale_spacing == typeof 1)
            this.scale_spacing = scale_spacing;
        this.type = type;
        //구조 만들기
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.g1 = document.createElementNS('http://www.w3.org/2000/svg', 'g'); //그래프를 그림
        this.g2 = document.createElementNS('http://www.w3.org/2000/svg', 'g'); //축을 그림
        this.g3 = document.createElementNS('http://www.w3.org/2000/svg', 'g'); //범례를 그림
        dom.appendChild(this.svg);
        this.svg.appendChild(this.g1);
        this.svg.appendChild(this.g2);
        this.svg.appendChild(this.g3);
        //설정하기
        this.xlabel = xlabel;
        this.ylabel = ylabel;
    }
    Graph.prototype.map = function (v, a, b, c, d) {
        var rate = (v - a) / (b - a);
        return d * rate + c * (1 - rate);
    };
    Graph.prototype.set_x_as_time = function () {
        this.x_is_time = true;
    };
    Graph.prototype.get_xminmax = function () {
        if (!this.x_data.length)
            return;
        return [Math.min.apply(Math, __spreadArray([], __read(this.x_data), false)), Math.max.apply(Math, __spreadArray([], __read(this.x_data), false))];
    };
    Graph.prototype.set_label_len_max = function (n) {
        this.label_len_max = n;
    };
    Graph.prototype.set_data = function (x_data, y_data, data_label) {
        var _this = this;
        console.log('set_data');
        return new Promise(function (resolve, reject) {
            if (x_data.length != y_data.length || !x_data.length || !y_data.length)
                reject('올바르지 않은 범위');
            x_data = x_data.slice();
            y_data = y_data.slice();
            // if(!this.x_data.length){
            //     this.x_data = x_data
            //     this.y_datas = [y_data]
            // }else{
            _this.data_labels.push(data_label);
            _this.data_show.push(true);
            _this.data_color.push(_this.random_color());
            var new_x_data = __spreadArray([], __read(new Set(__spreadArray(__spreadArray([], __read(_this.x_data), false), __read(x_data), false))), false).sort(function (a, b) { return Number(a - b); });
            //console.log('[new_x_data, this.y_datas - b]',new_x_data, this.y_datas)
            _this.y_datas = _this.y_datas.map(function (data) { return new_x_data.map(function (v) { return data[_this.x_data.indexOf(v)]; }); });
            //console.log('[new_x_data, this.y_datas - a]',new_x_data, this.y_datas)
            _this.y_datas.push(new_x_data.map(function (v) { return y_data[x_data.indexOf(v)]; }));
            //console.log('[new_x_data, this.y_datas - aφ]',new_x_data, this.y_datas)
            _this.x_data = new_x_data;
            resolve(true);
            //}
        });
    };
    Graph.prototype.random_color = function () {
        var srt = Math.round(Math.random() * 0xffffff).toString(16);
        while (srt.length != 6)
            srt = '0' + srt;
        return "#" + srt;
    };
    Graph.prototype.create_path = function (d, stroke_color, stroke_width, classList) {
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttributeNS(null, 'd', d);
        path.setAttributeNS(null, 'stroke', stroke_color);
        path.setAttributeNS(null, 'fill', 'none');
        path.setAttributeNS(null, 'stroke-width', stroke_width + "px");
        classList.forEach(function (v) { return path.classList.add(v); });
        return path;
    };
    Graph.prototype.create_text = function (str, x, y, color, font_size, text_anchor, rotate) {
        var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.innerHTML = str;
        text.setAttributeNS(null, 'x', String(x));
        text.setAttributeNS(null, 'y', String(y));
        text.setAttributeNS(null, 'style', "font-size:" + font_size + "pt");
        if (typeof text_anchor == typeof '1')
            text.setAttributeNS(null, 'text-anchor', text_anchor);
        if (typeof rotate == typeof 1) {
            text.setAttributeNS(null, 'transform', "rotate(" + rotate + ")");
            text.setAttributeNS(null, 'transform-origin', x + " " + y);
        }
        return text;
    };
    Graph.prototype.create_circle = function (r, x, y, color) {
        var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttributeNS(null, 'r', String(r));
        circle.setAttributeNS(null, 'cx', String(x));
        circle.setAttributeNS(null, 'cy', String(y));
        circle.setAttributeNS(null, 'fill', color);
        return circle;
    };
    Graph.prototype.setsize = function () {
        this.svg.setAttribute('viewbox', "0 0 " + this.width + " " + this.height);
        this.svg.style.width = this.width + "px";
        this.svg.style.height = this.height + "px";
    };
    Graph.prototype.drow = function (width, height, xmin, xmax) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.log('drow');
                this.width = width;
                this.height = height;
                this.setsize();
                this.xmin = xmin;
                this.xmax = xmax;
                this.drow_legend();
                this.drow_data();
                this.drow_axis();
                return [2 /*return*/];
            });
        });
    };
    Graph.prototype.drow_data = function () {
        var _this = this;
        this.g1.innerHTML = '';
        this.ymin = Infinity;
        this.ymax = -Infinity;
        var x_out = [];
        var y_out = this.y_datas.map(function (v) { return new Array(); });
        this.x_data.forEach(function (v, i, ar) {
            if ((_this.x_data.length - 1 == i || ar[i + 1] > _this.xmin) && (i == 0 || ar[i - 1] < _this.xmax)) {
                x_out.push(ar[i]);
                _this.y_datas.forEach(function (data, j) {
                    if (_this.data_show[j] && !isNaN(data[i])) {
                        _this.ymin = Math.min(_this.ymin, data[i]);
                        _this.ymax = Math.max(_this.ymax, data[i]);
                    }
                    y_out[j].push(data[i]);
                });
            }
        });
        console.log('[x_out, y_out]', x_out, y_out, this.type);
        if (this.type == '꺾은선') {
            y_out.forEach(function (data, i) {
                if (_this.data_show[i]) {
                    var d = x_out.map(function (v, i) { return isNaN(v) ? '' : "" + (i == 0 ? 'M' : 'L') + _this.map(v, _this.xmin, _this.xmax, 40, _this.width) + " " + _this.map(data[i], _this.ymin, _this.ymax, _this.height - _this.dataheight, 0); }).join(' ');
                    //console.log('안',data,d)
                    _this.g1.appendChild(_this.create_path(d, _this.data_color[i], 2, ['graph_data']));
                }
            });
        }
    };
    Graph.prototype.drow_axis = function () {
        var _this = this;
        this.g2.innerHTML = '';
        //console.log('[drow_axis]',this.g2)
        this.g2.appendChild(this.create_path("M40 0 L40 " + (this.height - this.dataheight), 'black', 1, ['graph_axis']));
        this.g2.appendChild(this.create_path("M40 " + (this.height - this.dataheight) + " L" + this.width + " " + (this.height - this.dataheight), 'black', 1, ['graph_axis']));
        function find_good_interval(a) {
            var b = Math.log10(a);
            var n = Math.floor(b);
            var α = b - n;
            var t = [0, Math.log10(2), Math.log10(4), Math.log10(5)].map(function (v) { return Math.abs(v - α); });
            //console.log('[α]',a,b,α,t)
            return [(Math.pow(10, n)) * [1, 2, 4, 5][t.indexOf(Math.min.apply(Math, __spreadArray([], __read(t), false)))], n];
        }
        var _a = __read(find_good_interval((this.ymax - this.ymin) * (this.scale_spacing / this.height)), 2), s_y = _a[0], ny = _a[1];
        console.log('[scale_spacing]', s_y, ny);
        this.g2.appendChild(this.create_text(this.xlabel, this.width / 2 + 20, this.height - this.dataheight + 30, 'black', 10, 'middle'));
        this.g2.appendChild(this.create_text(this.ylabel, 12, (this.height - this.dataheight) / 2, 'black', 10, 'middle', 270));
        //x축 축 위에서 
        if (this.x_is_time) {
            //x축을 시간으로 삼음
            var view_dis_1 = (this.xmax - this.xmin) * (this.scale_spacing / this.width);
            // 단위로 삼을 것들
            var time_dis = [1, 10, 60, 60 * 10, 3600, 3600 * 3, 3600 * 6, 3600 * 24, 3600 * 24 * 2, 3600 * 24 * 7, 3600 * 24 * 30, 3600 * 24 * 30 * 365].map(function (v) { return v * 1000; });
            var time_fn = ['getSeconds', 'getSeconds', 'getMinutes', 'getMinutes', 'getHours', 'getHours', 'getHours', 'getDate', 'getDate', 'getDate', 'getMonth', 'getFullYear'];
            var time_name = ['초', '초', '분', '분', '시', '시', '시', '일', '일', '일', '월', '년'];
            //const time_offset:boolean[] =time_name.map((v)=>v=='월'); //월만
            var time_id_1 = [0];
            var tmp = 0;
            for (var i_1 = 1; i_1 < time_name.length; i_1++) {
                tmp += (time_name[i_1] == time_name[i_1 - 1] ? 0 : 1);
                time_id_1.push(tmp);
            }
            console.log(time_id_1);
            //가장 가까운거 찾기. 이 값을 i에 저장
            var tmp_ar = time_dis.map(function (v) { return Math.abs(Math.log(v / view_dis_1)); });
            var timetype_1 = tmp_ar.indexOf(Math.min.apply(Math, __spreadArray([], __read(tmp_ar), false)));
            console.log('[가장 가까운 단위는]', view_dis_1, timetype_1, time_fn[timetype_1], time_dis[timetype_1], time_name[timetype_1]);
            //시작하는 시점 찾기
            var v = this.xmin;
            var date = new Date(v);
            if (time_id_1[timetype_1] <= 3)
                v = Math.floor(v / (time_dis[timetype_1])) * (time_dis[timetype_1]);
            else if (time_id_1[timetype_1] == 4)
                v = Number(new Date(date.getFullYear(), date.getMonth()));
            else if (time_id_1[timetype_1] == 5)
                v = Number(new Date(date.getFullYear(), 0));
            //라벨 들어갈 문자열을 위해, 초,분,시,월,일이 변화했는지 알 필요 있다.
            var label_fns = {
                get_timeunit_list: function (d) {
                    var date = new Date(d);
                    return [date.getSeconds(), date.getMinutes(), date.getHours(), date.getDate(), date.getMonth(), date.getFullYear()].splice(time_id_1[timetype_1]);
                },
                get_label_text: function (pre_timeunit_list, timeunit_list) {
                    var flag = false;
                    var out = [];
                    var n = 6 - timeunit_list.length;
                    for (var i_2 = timeunit_list.length - 1; i_2 >= 0; i_2--) {
                        if (flag || timeunit_list[i_2] != pre_timeunit_list[i_2]) {
                            flag = true;
                            out.push("" + (timeunit_list[i_2] + Number(n + i_2 == 4)) + ['초', '분', '시', '일', '월', '년'][n + i_2]);
                        }
                    } //console.log(out,'ewf', pre_timeunit_list, timeunit_list)
                    return [out[0]]; //맨 최상위 것만 내보내자. 어차피 알 수 있음!
                    if (out.length > 2)
                        return [out.splice(0, 1).join(' '), out.splice(0, 2).join(' '), out.join(' ')]; //`<tspan dx="0">${out.splice(0,3).join(' ')}</tspan><tspan dy="1.2em" dx="0">${out.join(' ')}</tspan>` ;
                    else
                        return [out.join(' ')];
                }
            };
            var pre_timeunit_list = [NaN, NaN, NaN, NaN, NaN, NaN];
            var _loop_1 = function () {
                var timeunit_list = label_fns.get_timeunit_list(v); //라벨 그리는 용도임
                if (v >= this_1.xmin) {
                    //console.log('while',new Date(v), time_id[timetype], time_name[timetype],v, this.xmax)
                    var vx_1 = this_1.map(v, this_1.xmin, this_1.xmax, 40, this_1.width);
                    //console.log('vx',vx,)
                    //축그리기
                    this_1.g2.appendChild(this_1.create_path("M" + vx_1 + " 0 L" + vx_1 + " " + (this_1.height - this_1.dataheight), 'gray', 1, []));
                    //라벨 그리기
                    label_fns.get_label_text(pre_timeunit_list, timeunit_list).forEach(function (v, i) {
                        var label = _this.create_text(v, vx_1, _this.height - _this.dataheight + 15 + i * 10, 'black', 8);
                        _this.g2.appendChild(label);
                    });
                    //label.setAttributeNS(null, 'transform', 'rotate(8)')
                    //label.setAttributeNS(null, 'transform-origin', `${vx} ${this.height-this.dataheight+15}`)
                }
                //다음 시점으로 넘어간다.
                if (time_id_1[timetype_1] <= 3)
                    v += time_dis[timetype_1];
                else {
                    var date_1 = new Date(v);
                    if (time_id_1[timetype_1] == 4)
                        v = Number(new Date(date_1.getFullYear(), date_1.getMonth() + 1));
                    else if (time_id_1[timetype_1] == 5)
                        v = Number(new Date(date_1.getFullYear() + 1, 0));
                }
                pre_timeunit_list = timeunit_list;
            };
            var this_1 = this;
            //반복하기
            while (v <= this.xmax) {
                _loop_1();
            }
        }
        else { //아님
            var _b = __read(find_good_interval((this.xmax - this.xmin) * (this.scale_spacing / this.width)), 2), s_x = _b[0], nx = _b[1];
            for (var i = Math.floor(Number(this.xmin / s_x)); i * s_x < this.xmax; i++) {
                var v = i * s_x;
                if (v < this.xmin)
                    continue;
                var vx = this.map(v, this.xmin, this.xmax, 40, this.width);
                this.g2.appendChild(this.create_path("M" + vx + " 0 L" + vx + " " + (this.height - this.dataheight), 'gray', 1, []));
                this.g2.appendChild(this.create_text(parseFloat("" + v).toFixed(Math.max(-nx, 0)), vx, this.height - this.dataheight + 10, 'black', 8));
            }
        }
        //y축 축 위에서 
        for (var i = Math.floor(Number(this.ymin / s_y)); i * s_y < this.ymax; i++) {
            var v = i * s_y;
            if (v < this.ymin)
                continue;
            var vy = this.map(v, this.ymin, this.ymax, this.height - this.dataheight, 0);
            this.g2.appendChild(this.create_path("M40 " + vy + " L" + this.width + " " + vy + " " + (this.height - this.dataheight), 'gray', 1, ['graph_axis']));
            this.g2.appendChild(this.create_text(parseFloat("" + v).toFixed(Math.max(-ny, 0)), 40 - 2, vy, 'black', 8, 'end'));
        }
    };
    Graph.prototype.drow_legend = function () {
        var _this = this;
        console.log('[drow_legend]');
        this.g3.innerHTML = '';
        var legend_width = 20 + Math.max.apply(Math, __spreadArray([], __read(this.data_labels.map(function (v) { return Math.min(v.length, _this.label_len_max); })), false)) * 9;
        var length = this.data_labels.length;
        var n = Math.floor(this.width / legend_width) ? Math.floor(this.width / legend_width) : 1;
        this.dataheight = 45 + Math.floor(length / n) * 8;
        console.log('drow_legend', legend_width, length, n);
        var _loop_2 = function () {
            var index = i;
            var x = (i % n) * legend_width;
            var y = (Math.floor(length / n) - Math.floor(i / n)) * 10;
            var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.appendChild(this_2.create_circle(4, x + 4, this_2.height - y - 4 - 1, this_2.data_color[i]));
            g.appendChild(this_2.create_text(this_2.data_labels[i].substr(0, this_2.label_len_max), x + 14, this_2.height - y - 1, 'black', 8));
            g.style.opacity = this_2.data_show[i] ? '1' : '0.1';
            g.addEventListener('click', function (e) {
                console.log(e, index, _this);
                _this.data_show[index] = !_this.data_show[index];
                _this.drow_legend();
                _this.drow_data();
                _this.drow_axis();
            });
            g.addEventListener('dblclick', function (e) {
                console.log(e, index, _this);
                _this.data_show.forEach(function (v, i, ar) { return ar[i] = false; });
                _this.data_show[index] = true;
                _this.drow_legend();
                _this.drow_data();
                _this.drow_axis();
            });
            this_2.g3.appendChild(g);
        };
        var this_2 = this;
        for (var i = 0; i < length; i++) {
            _loop_2();
        }
    };
    return Graph;
}());
