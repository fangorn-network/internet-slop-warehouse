/* Original adapter: CC0-1.0. Bundled decoders: BSD-3-Clause and ISC.
node_modules/@mapbox/vector-tile/LICENSE.txt

Copyright (c) 2024, Mapbox

All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of Mapbox nor the names of its contributors
      may be used to endorse or promote products derived from this software
      without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


----------------

node_modules/@mapbox/point-geometry/LICENSE

Copyright (c) 2024, Mapbox

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.


----------------

node_modules/pbf/LICENSE

Copyright (c) 2026, Mapbox
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of pbf nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/
// node_modules/@mapbox/point-geometry/index.js
/**
* A standalone point geometry with useful accessor, comparison, and
* modification methods.
*
* @class
* @param {number} x the x-coordinate. This could be longitude or screen pixels, or any other sort of unit.
* @param {number} y the y-coordinate. This could be latitude or screen pixels, or any other sort of unit.
*
* @example
* const point = new Point(-77, 38);
*/
function Point(x, y) {
	this.x = x;
	this.y = y;
}
Point.prototype = {
	/**
	* Clone this point, returning a new point that can be modified
	* without affecting the old one.
	* @return {Point} the clone
	*/
	clone() {
		return new Point(this.x, this.y);
	},
	/**
	* Add this point's x & y coordinates to another point,
	* yielding a new point.
	* @param {Point} p the other point
	* @return {Point} output point
	*/
	add(p) {
		return this.clone()._add(p);
	},
	/**
	* Subtract this point's x & y coordinates to from point,
	* yielding a new point.
	* @param {Point} p the other point
	* @return {Point} output point
	*/
	sub(p) {
		return this.clone()._sub(p);
	},
	/**
	* Multiply this point's x & y coordinates by point,
	* yielding a new point.
	* @param {Point} p the other point
	* @return {Point} output point
	*/
	multByPoint(p) {
		return this.clone()._multByPoint(p);
	},
	/**
	* Divide this point's x & y coordinates by point,
	* yielding a new point.
	* @param {Point} p the other point
	* @return {Point} output point
	*/
	divByPoint(p) {
		return this.clone()._divByPoint(p);
	},
	/**
	* Multiply this point's x & y coordinates by a factor,
	* yielding a new point.
	* @param {number} k factor
	* @return {Point} output point
	*/
	mult(k) {
		return this.clone()._mult(k);
	},
	/**
	* Divide this point's x & y coordinates by a factor,
	* yielding a new point.
	* @param {number} k factor
	* @return {Point} output point
	*/
	div(k) {
		return this.clone()._div(k);
	},
	/**
	* Rotate this point around the 0, 0 origin by an angle a,
	* given in radians
	* @param {number} a angle to rotate around, in radians
	* @return {Point} output point
	*/
	rotate(a) {
		return this.clone()._rotate(a);
	},
	/**
	* Rotate this point around p point by an angle a,
	* given in radians
	* @param {number} a angle to rotate around, in radians
	* @param {Point} p Point to rotate around
	* @return {Point} output point
	*/
	rotateAround(a, p) {
		return this.clone()._rotateAround(a, p);
	},
	/**
	* Multiply this point by a 4x1 transformation matrix
	* @param {[number, number, number, number]} m transformation matrix
	* @return {Point} output point
	*/
	matMult(m) {
		return this.clone()._matMult(m);
	},
	/**
	* Calculate this point but as a unit vector from 0, 0, meaning
	* that the distance from the resulting point to the 0, 0
	* coordinate will be equal to 1 and the angle from the resulting
	* point to the 0, 0 coordinate will be the same as before.
	* @return {Point} unit vector point
	*/
	unit() {
		return this.clone()._unit();
	},
	/**
	* Compute a perpendicular point, where the new y coordinate
	* is the old x coordinate and the new x coordinate is the old y
	* coordinate multiplied by -1
	* @return {Point} perpendicular point
	*/
	perp() {
		return this.clone()._perp();
	},
	/**
	* Return a version of this point with the x & y coordinates
	* rounded to integers.
	* @return {Point} rounded point
	*/
	round() {
		return this.clone()._round();
	},
	/**
	* Return the magnitude of this point: this is the Euclidean
	* distance from the 0, 0 coordinate to this point's x and y
	* coordinates.
	* @return {number} magnitude
	*/
	mag() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	},
	/**
	* Judge whether this point is equal to another point, returning
	* true or false.
	* @param {Point} other the other point
	* @return {boolean} whether the points are equal
	*/
	equals(other) {
		return this.x === other.x && this.y === other.y;
	},
	/**
	* Calculate the distance from this point to another point
	* @param {Point} p the other point
	* @return {number} distance
	*/
	dist(p) {
		return Math.sqrt(this.distSqr(p));
	},
	/**
	* Calculate the distance from this point to another point,
	* without the square root step. Useful if you're comparing
	* relative distances.
	* @param {Point} p the other point
	* @return {number} distance
	*/
	distSqr(p) {
		const dx = p.x - this.x, dy = p.y - this.y;
		return dx * dx + dy * dy;
	},
	/**
	* Get the angle from the 0, 0 coordinate to this point, in radians
	* coordinates.
	* @return {number} angle
	*/
	angle() {
		return Math.atan2(this.y, this.x);
	},
	/**
	* Get the angle from this point to another point, in radians
	* @param {Point} b the other point
	* @return {number} angle
	*/
	angleTo(b) {
		return Math.atan2(this.y - b.y, this.x - b.x);
	},
	/**
	* Get the angle between this point and another point, in radians
	* @param {Point} b the other point
	* @return {number} angle
	*/
	angleWith(b) {
		return this.angleWithSep(b.x, b.y);
	},
	/**
	* Find the angle of the two vectors, solving the formula for
	* the cross product a x b = |a||b|sin(θ) for θ.
	* @param {number} x the x-coordinate
	* @param {number} y the y-coordinate
	* @return {number} the angle in radians
	*/
	angleWithSep(x, y) {
		return Math.atan2(this.x * y - this.y * x, this.x * x + this.y * y);
	},
	/** @param {[number, number, number, number]} m */
	_matMult(m) {
		const x = m[0] * this.x + m[1] * this.y, y = m[2] * this.x + m[3] * this.y;
		this.x = x;
		this.y = y;
		return this;
	},
	/** @param {Point} p */
	_add(p) {
		this.x += p.x;
		this.y += p.y;
		return this;
	},
	/** @param {Point} p */
	_sub(p) {
		this.x -= p.x;
		this.y -= p.y;
		return this;
	},
	/** @param {number} k */
	_mult(k) {
		this.x *= k;
		this.y *= k;
		return this;
	},
	/** @param {number} k */
	_div(k) {
		this.x /= k;
		this.y /= k;
		return this;
	},
	/** @param {Point} p */
	_multByPoint(p) {
		this.x *= p.x;
		this.y *= p.y;
		return this;
	},
	/** @param {Point} p */
	_divByPoint(p) {
		this.x /= p.x;
		this.y /= p.y;
		return this;
	},
	_unit() {
		this._div(this.mag());
		return this;
	},
	_perp() {
		const y = this.y;
		this.y = this.x;
		this.x = -y;
		return this;
	},
	/** @param {number} angle */
	_rotate(angle) {
		const cos = Math.cos(angle), sin = Math.sin(angle), x = cos * this.x - sin * this.y, y = sin * this.x + cos * this.y;
		this.x = x;
		this.y = y;
		return this;
	},
	/**
	* @param {number} angle
	* @param {Point} p
	*/
	_rotateAround(angle, p) {
		const cos = Math.cos(angle), sin = Math.sin(angle), x = p.x + cos * (this.x - p.x) - sin * (this.y - p.y), y = p.y + sin * (this.x - p.x) + cos * (this.y - p.y);
		this.x = x;
		this.y = y;
		return this;
	},
	_round() {
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
		return this;
	},
	constructor: Point
};
/**
* Construct a point from an array if necessary, otherwise if the input
* is already a Point, return it unchanged.
* @param {Point | [number, number] | {x: number, y: number}} p input value
* @return {Point} constructed point.
* @example
* // this
* var point = Point.convert([0, 1]);
* // is equivalent to
* var point = new Point(0, 1);
*/
Point.convert = function(p) {
	if (p instanceof Point) return p;
	if (Array.isArray(p)) return new Point(+p[0], +p[1]);
	if (p.x !== void 0 && p.y !== void 0) return new Point(+p.x, +p.y);
	throw new Error("Expected [x, y] or {x, y} point format");
};
// node_modules/@mapbox/vector-tile/index.js
/** @import {PbfReader} from 'pbf' */
/** @import {Feature} from 'geojson' */
var VectorTileFeature = class {
	/**
	* @param {PbfReader} pbf
	* @param {number} end
	* @param {number} extent
	* @param {string[]} keys
	* @param {(number | string | boolean)[]} values
	*/
	constructor(pbf, end, extent, keys, values) {
		/** @type {Record<string, number | string | boolean>} */
		this.properties = Object.create(null);
		this.extent = extent;
		/** @type {0 | 1 | 2 | 3} */
		this.type = 0;
		/** @type {number | undefined} */
		this.id = void 0;
		/** @private */
		this._pbf = pbf;
		/** @private */
		this._geometry = -1;
		/** @private */
		this._keys = keys;
		/** @private */
		this._values = values;
		while (pbf.pos < end) {
			const tag = pbf.readVarint();
			if (tag === 8) this.id = pbf.readVarint();
			else if (tag === 18) {
				const tagsEnd = pbf.readVarint() + pbf.pos;
				while (pbf.pos < tagsEnd) {
					const key = keys[pbf.readVarint()];
					const value = values[pbf.readVarint()];
					this.properties[key] = value;
				}
			} else if (tag === 24) this.type = pbf.readVarint();
			else if (tag === 34) {
				this._geometry = pbf.pos;
				pbf.skip(tag);
			} else pbf.skip(tag);
		}
	}
	loadGeometry() {
		if (this._geometry < 0) throw new Error("feature has no geometry");
		const pbf = this._pbf;
		pbf.pos = this._geometry;
		const end = pbf.readVarint() + pbf.pos;
		/** @type Point[][] */
		const lines = [];
		/** @type Point[] | undefined */
		let line;
		let cmd = 1;
		let length = 0;
		let x = 0;
		let y = 0;
		while (pbf.pos < end) {
			if (length <= 0) {
				const cmdLen = pbf.readVarint();
				cmd = cmdLen & 7;
				length = cmdLen >> 3;
				if (length === 0) continue;
			}
			length--;
			if (cmd === 1) {
				x += pbf.readSVarint();
				y += pbf.readSVarint();
				if (line) lines.push(line);
				line = [new Point(x, y)];
			} else if (cmd === 2) {
				x += pbf.readSVarint();
				y += pbf.readSVarint();
				if (line) line.push(new Point(x, y));
			} else if (cmd === 7) {
				if (line) line.push(line[0].clone());
			} else throw new Error(`unknown command ${cmd}`);
		}
		if (line) lines.push(line);
		return lines;
	}
	bbox() {
		if (this._geometry < 0) throw new Error("feature has no geometry");
		const pbf = this._pbf;
		pbf.pos = this._geometry;
		const end = pbf.readVarint() + pbf.pos;
		let cmd = 1, length = 0, x = 0, y = 0, x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
		while (pbf.pos < end) {
			if (length <= 0) {
				const cmdLen = pbf.readVarint();
				cmd = cmdLen & 7;
				length = cmdLen >> 3;
				if (length === 0) continue;
			}
			length--;
			if (cmd === 1 || cmd === 2) {
				x += pbf.readSVarint();
				y += pbf.readSVarint();
				if (x < x1) x1 = x;
				if (x > x2) x2 = x;
				if (y < y1) y1 = y;
				if (y > y2) y2 = y;
			} else if (cmd !== 7) throw new Error(`unknown command ${cmd}`);
		}
		return [
			x1,
			y1,
			x2,
			y2
		];
	}
	/**
	* @param {number} x
	* @param {number} y
	* @param {number} z
	* @return {Feature}
	*/
	toGeoJSON(x, y, z) {
		const size = this.extent * Math.pow(2, z), x0 = this.extent * x, y0 = this.extent * y, vtCoords = this.loadGeometry();
		/** @param {Point} p */
		function projectPoint(p) {
			return [(p.x + x0) * 360 / size - 180, 360 / Math.PI * Math.atan(Math.exp((1 - (p.y + y0) * 2 / size) * Math.PI)) - 90];
		}
		/** @param {Point[]} line */
		function projectLine(line) {
			return line.map(projectPoint);
		}
		/** @type {Feature["geometry"]} */
		let geometry;
		if (this.type === 1) {
			const points = [];
			for (const line of vtCoords) points.push(line[0]);
			const coordinates = projectLine(points);
			geometry = points.length === 1 ? {
				type: "Point",
				coordinates: coordinates[0]
			} : {
				type: "MultiPoint",
				coordinates
			};
		} else if (this.type === 2) {
			const coordinates = vtCoords.map(projectLine);
			geometry = coordinates.length === 1 ? {
				type: "LineString",
				coordinates: coordinates[0]
			} : {
				type: "MultiLineString",
				coordinates
			};
		} else if (this.type === 3) {
			const polygons = classifyRings(vtCoords);
			const coordinates = [];
			for (const polygon of polygons) coordinates.push(polygon.map(projectLine));
			geometry = coordinates.length === 1 ? {
				type: "Polygon",
				coordinates: coordinates[0]
			} : {
				type: "MultiPolygon",
				coordinates
			};
		} else throw new Error("unknown feature type");
		/** @type {Feature} */
		const result = {
			type: "Feature",
			geometry,
			properties: this.properties
		};
		if (this.id != null) result.id = this.id;
		return result;
	}
};
/** @type {['Unknown', 'Point', 'LineString', 'Polygon']} */
VectorTileFeature.types = [
	"Unknown",
	"Point",
	"LineString",
	"Polygon"
];
/** classifies an array of rings into polygons with outer rings and holes
* @param {Point[][]} rings
*/
function classifyRings(rings) {
	const len = rings.length;
	if (len <= 1) return [rings];
	const polygons = [];
	let polygon, ccw;
	for (let i = 0; i < len; i++) {
		const area = signedArea(rings[i]);
		if (area === 0) continue;
		if (ccw === void 0) ccw = area < 0;
		if (ccw === area < 0) {
			if (polygon) polygons.push(polygon);
			polygon = [rings[i]];
		} else if (polygon) polygon.push(rings[i]);
	}
	if (polygon) polygons.push(polygon);
	return polygons;
}
/** @param {Point[]} ring */
function signedArea(ring) {
	let sum = 0;
	for (let i = 0, len = ring.length, j = len - 1, p1, p2; i < len; j = i++) {
		p1 = ring[i];
		p2 = ring[j];
		sum += (p2.x - p1.x) * (p1.y + p2.y);
	}
	return sum;
}
var VectorTileLayer = class {
	/**
	* @param {PbfReader} pbf
	* @param {number} [end]
	*/
	constructor(pbf, end) {
		this.version = 1;
		this.name = "";
		this.extent = 4096;
		this.length = 0;
		/** @private */
		this._pbf = pbf;
		/** @private
		* @type {string[]} */
		this._keys = [];
		/** @private
		* @type {(number | string | boolean)[]} */
		this._values = [];
		/** @private
		* @type {number[]} */
		this._features = [];
		if (end === void 0) end = pbf.length;
		while (pbf.pos < end) {
			const tag = pbf.readVarint();
			if (tag === 10) this.name = pbf.readString();
			else if (tag === 18) {
				this._features.push(pbf.pos);
				pbf.skip(tag);
			} else if (tag === 26) this._keys.push(pbf.readString());
			else if (tag === 34) this._values.push(readValueMessage(pbf));
			else if (tag === 40) this.extent = pbf.readVarint();
			else if (tag === 120) this.version = pbf.readVarint();
			else pbf.skip(tag);
		}
		this.length = this._features.length;
	}
	/** return feature `i` from this layer as a `VectorTileFeature`
	* @param {number} i
	*/
	feature(i) {
		if (i < 0 || i >= this._features.length) throw new Error("feature index out of bounds");
		this._pbf.pos = this._features[i];
		const end = this._pbf.readVarint() + this._pbf.pos;
		return new VectorTileFeature(this._pbf, end, this.extent, this._keys, this._values);
	}
};
/**
* @param {PbfReader} pbf
*/
function readValueMessage(pbf) {
	let value = null;
	const end = pbf.readVarint() + pbf.pos;
	while (pbf.pos < end) {
		const tag = pbf.readVarint();
		value = tag === 10 ? pbf.readString() : tag === 21 ? pbf.readFloat() : tag === 25 ? pbf.readDouble() : tag === 32 ? pbf.readVarint(true) : tag === 40 ? pbf.readVarint() : tag === 48 ? pbf.readSVarint() : tag === 56 ? pbf.readBoolean() : (pbf.skip(tag), null);
	}
	if (value == null) throw new Error("unknown feature value");
	return value;
}
var VectorTile = class {
	/**
	* @param {PbfReader} pbf
	* @param {number} [end]
	*/
	constructor(pbf, end = pbf.length) {
		/** @type {Record<string, VectorTileLayer>} */
		const layers = Object.create(null);
		while (pbf.pos < end) {
			const tag = pbf.readVarint();
			if (tag === 26) {
				const layer = new VectorTileLayer(pbf, pbf.readVarint() + pbf.pos);
				if (layer.length) layers[layer.name] = layer;
			} else pbf.skip(tag);
		}
		this.layers = layers;
	}
};
// node_modules/pbf/index.js
const SHIFT_LEFT_32 = 4294967296;
const TEXT_DECODER_MIN_LENGTH = 12;
const utf8TextDecoder = typeof TextDecoder === "undefined" ? null : new TextDecoder("utf-8");
const PBF_VARINT = 0;
const PBF_FIXED64 = 1;
const PBF_BYTES = 2;
const PBF_FIXED32 = 5;
var PbfReader = class {
	/**
	* @param {Uint8Array | ArrayBuffer} buf
	*/
	constructor(buf) {
		this.buf = ArrayBuffer.isView(buf) ? buf : new Uint8Array(buf);
		this.dataView = new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength);
		this.pos = 0;
		this.type = 0;
		this._valueStart = -1;
		this.length = this.buf.length;
	}
	/**
	* @template T
	* @param {(tag: number, result: T, pbf: PbfReader) => void} readField
	* @param {T} result
	* @param {number} [end]
	*/
	readFields(readField, result, end = this.length) {
		let field;
		while (field = this.nextField(end)) readField(field, result, this);
		return result;
	}
	/**
	* @template T
	* @param {(tag: number, result: T, pbf: PbfReader) => void} readField
	* @param {T} result
	*/
	readMessage(readField, result) {
		return this.readFields(readField, result, this.readVarint() + this.pos);
	}
	readFixed32() {
		const val = this.dataView.getUint32(this.pos, true);
		this.pos += 4;
		return val;
	}
	readSFixed32() {
		const val = this.dataView.getInt32(this.pos, true);
		this.pos += 4;
		return val;
	}
	readFixed64() {
		const val = this.dataView.getUint32(this.pos, true) + this.dataView.getUint32(this.pos + 4, true) * SHIFT_LEFT_32;
		this.pos += 8;
		return val;
	}
	readSFixed64() {
		const val = this.dataView.getUint32(this.pos, true) + this.dataView.getInt32(this.pos + 4, true) * SHIFT_LEFT_32;
		this.pos += 8;
		return val;
	}
	readFloat() {
		const val = this.dataView.getFloat32(this.pos, true);
		this.pos += 4;
		return val;
	}
	readDouble() {
		const val = this.dataView.getFloat64(this.pos, true);
		this.pos += 8;
		return val;
	}
	/**
	* @param {boolean} [isSigned]
	*/
	readVarint(isSigned) {
		const buf = this.buf;
		const b0 = buf[this.pos++];
		if (b0 < 128) return b0;
		let val = b0 & 127, b;
		b = buf[this.pos++];
		val |= (b & 127) << 7;
		if (b < 128) return val;
		b = buf[this.pos++];
		val |= (b & 127) << 14;
		if (b < 128) return val;
		b = buf[this.pos++];
		val |= (b & 127) << 21;
		if (b < 128) return val;
		b = buf[this.pos];
		val |= (b & 15) << 28;
		return readVarintRemainder(val, isSigned, this);
	}
	readSVarint() {
		const num = this.readVarint();
		return num % 2 === 1 ? (num + 1) / -2 : num / 2;
	}
	readBoolean() {
		return Boolean(this.readVarint());
	}
	readString() {
		const end = this.readVarint() + this.pos;
		const pos = this.pos;
		this.pos = end;
		if (end - pos >= TEXT_DECODER_MIN_LENGTH && utf8TextDecoder) return utf8TextDecoder.decode(this.buf.subarray(pos, end));
		return readUtf8(this.buf, pos, end);
	}
	readBytes() {
		const end = this.readVarint() + this.pos, buffer = this.buf.subarray(this.pos, end);
		this.pos = end;
		return buffer;
	}
	/**
	* @param {number[]} [arr]
	* @param {boolean} [isSigned]
	*/
	readPackedVarint(arr = [], isSigned) {
		const end = this.readPackedEnd();
		while (this.pos < end) arr.push(this.readVarint(isSigned));
		return arr;
	}
	/** @param {number[]} [arr] */
	readPackedSVarint(arr = []) {
		const end = this.readPackedEnd();
		while (this.pos < end) arr.push(this.readSVarint());
		return arr;
	}
	/** @param {boolean[]} [arr] */
	readPackedBoolean(arr = []) {
		const end = this.readPackedEnd();
		while (this.pos < end) arr.push(this.readBoolean());
		return arr;
	}
	/** @param {number[]} [arr] */
	readPackedFloat(arr = []) {
		const end = this.readPackedEnd();
		while (this.pos < end) arr.push(this.readFloat());
		return arr;
	}
	/** @param {number[]} [arr] */
	readPackedDouble(arr = []) {
		const end = this.readPackedEnd();
		while (this.pos < end) arr.push(this.readDouble());
		return arr;
	}
	/** @param {number[]} [arr] */
	readPackedFixed32(arr = []) {
		const end = this.readPackedEnd();
		while (this.pos < end) arr.push(this.readFixed32());
		return arr;
	}
	/** @param {number[]} [arr] */
	readPackedSFixed32(arr = []) {
		const end = this.readPackedEnd();
		while (this.pos < end) arr.push(this.readSFixed32());
		return arr;
	}
	/** @param {number[]} [arr] */
	readPackedFixed64(arr = []) {
		const end = this.readPackedEnd();
		while (this.pos < end) arr.push(this.readFixed64());
		return arr;
	}
	/** @param {number[]} [arr] */
	readPackedSFixed64(arr = []) {
		const end = this.readPackedEnd();
		while (this.pos < end) arr.push(this.readSFixed64());
		return arr;
	}
	readPackedEnd() {
		return this.type === PBF_BYTES ? this.readVarint() + this.pos : this.pos + 1;
	}
	/**
	* Advance to the next field. Returns the field number, or 0 at end-of-message.
	* @param {number} [end]
	*/
	nextField(end = this.length) {
		if (this.pos === this._valueStart) this.skip(this.type);
		if (this.pos >= end) return 0;
		const tag = this.readVarint();
		this.type = tag & 7;
		this._valueStart = this.pos;
		return tag >>> 3;
	}
	/** @param {number} val */
	skip(val) {
		const type = val & 7;
		if (type === PBF_VARINT) while (this.buf[this.pos++] > 127);
		else if (type === PBF_BYTES) this.pos = this.readVarint() + this.pos;
		else if (type === PBF_FIXED32) this.pos += 4;
		else if (type === PBF_FIXED64) this.pos += 8;
		else throw new Error(`Unimplemented type: ${type}`);
	}
};
/**
* @param {number} l
* @param {boolean | undefined} s
* @param {PbfReader} p
*/
function readVarintRemainder(l, s, p) {
	const buf = p.buf;
	let h, b;
	b = buf[p.pos++];
	h = (b & 112) >> 4;
	if (b < 128) return toNum(l, h, s);
	b = buf[p.pos++];
	h |= (b & 127) << 3;
	if (b < 128) return toNum(l, h, s);
	b = buf[p.pos++];
	h |= (b & 127) << 10;
	if (b < 128) return toNum(l, h, s);
	b = buf[p.pos++];
	h |= (b & 127) << 17;
	if (b < 128) return toNum(l, h, s);
	b = buf[p.pos++];
	h |= (b & 127) << 24;
	if (b < 128) return toNum(l, h, s);
	b = buf[p.pos++];
	h |= (b & 1) << 31;
	if (b < 128) return toNum(l, h, s);
	throw new Error("Expected varint not more than 10 bytes");
}
/**
* @param {number} low
* @param {number} high
* @param {boolean} [isSigned]
*/
function toNum(low, high, isSigned) {
	return isSigned ? high * 4294967296 + (low >>> 0) : (high >>> 0) * 4294967296 + (low >>> 0);
}
/**
* @param {Uint8Array} buf
* @param {number} pos
* @param {number} end
*/
function readUtf8(buf, pos, end) {
	let str = "";
	let i = pos;
	while (i < end) {
		const b0 = buf[i];
		let c = null;
		let bytesPerSequence = b0 > 239 ? 4 : b0 > 223 ? 3 : b0 > 191 ? 2 : 1;
		if (i + bytesPerSequence > end) break;
		let b1, b2, b3;
		if (bytesPerSequence === 1) {
			if (b0 < 128) c = b0;
		} else if (bytesPerSequence === 2) {
			b1 = buf[i + 1];
			if ((b1 & 192) === 128) {
				c = (b0 & 31) << 6 | b1 & 63;
				if (c <= 127) c = null;
			}
		} else if (bytesPerSequence === 3) {
			b1 = buf[i + 1];
			b2 = buf[i + 2];
			if ((b1 & 192) === 128 && (b2 & 192) === 128) {
				c = (b0 & 15) << 12 | (b1 & 63) << 6 | b2 & 63;
				if (c <= 2047 || c >= 55296 && c <= 57343) c = null;
			}
		} else if (bytesPerSequence === 4) {
			b1 = buf[i + 1];
			b2 = buf[i + 2];
			b3 = buf[i + 3];
			if ((b1 & 192) === 128 && (b2 & 192) === 128 && (b3 & 192) === 128) {
				c = (b0 & 15) << 18 | (b1 & 63) << 12 | (b2 & 63) << 6 | b3 & 63;
				if (c <= 65535 || c >= 1114112) c = null;
			}
		}
		if (c === null) {
			c = 65533;
			bytesPerSequence = 1;
		} else if (c > 65535) {
			c -= 65536;
			str += String.fromCharCode(c >>> 10 & 1023 | 55296);
			c = 56320 | c & 1023;
		}
		str += String.fromCharCode(c);
		i += bytesPerSequence;
	}
	return str;
}
// the vector adapter (original, CC0)
const UA = "InternetSlopWarehouse/0.1 (+https://internet-slop-warehouse.fangorn.network)";
const ll = (coordinate) => ({
	lon: coordinate[0],
	lat: coordinate[1]
});
function decodeTile(bytes, x, y, z) {
	if (!(bytes instanceof Uint8Array) || bytes.byteLength > 3e6 || ![
		x,
		y,
		z
	].every(Number.isInteger) || z < 0 || z > 22 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) throw Error("Invalid vector tile");
	const tile = new VectorTile(new PbfReader(bytes)), elements = [];
	let serial = 0;
	function polygon(coordinates, tags, id) {
		if (!coordinates[0]?.length) return;
		elements.push({
			type: "relation",
			id,
			tags,
			members: coordinates.map((ring, i) => ({
				type: "way",
				role: i ? "inner" : "outer",
				ref: id + "-" + i,
				geometry: ring.map(ll)
			}))
		});
	}
	for (const layerName of [
		"building",
		"transportation",
		"transportation_name",
		"housenumber",
		"water",
		"waterway",
		"poi",
		"place"
	]) {
		const layer = tile.layers[layerName];
		if (!layer) continue;
		for (let i = 0; i < layer.length; i++) {
			const f = layer.feature(i), geo = f.toGeoJSON(x, y, z), p = f.properties, id = `tile-${z}-${x}-${y}-${layerName}-${f.id ?? i}-${serial++}`, type = geo.geometry.type, c = geo.geometry.coordinates, name = String(p.name ?? p["name:en"] ?? p.name_en ?? "").slice(0, 240);
			let tags = {};
			if (layerName === "building") {
				if (p.hide_3d === true) continue;
				tags = {
					building: "yes",
					height: String(Math.max(3, Math.min(120, Number(p.render_height) || 6))),
					min_height: String(Number(p.render_min_height) || 0)
				};
			} else if (layerName === "water") tags = {
				natural: "water",
				name
			};
			else if (layerName === "waterway") tags = {
				waterway: "river",
				name
			};
			else if (layerName === "housenumber") tags = {
				"addr:housenumber": String(p.housenumber ?? ""),
				"addr:street": String(p.street ?? "")
			};
			else if (layerName === "transportation" || layerName === "transportation_name") {
				if ([
					"rail",
					"aerialway",
					"ferry"
				].includes(p.class)) continue;
				tags = {
					...layerName === "transportation_name" ? { _label_only: "yes" } : {},
					highway: {
						minor: "residential",
						street: "residential",
						path: "footway",
						track: "service"
					}[p.class] ?? p.class ?? "service",
					name,
					...p.brunnel === "bridge" ? { bridge: "yes" } : {}
				};
			} else {
				const kind = String(p.subclass ?? p.class ?? "");
				if (kind === "water_tower") tags = {
					man_made: "water_tower",
					name
				};
				else if (layerName === "place") tags = {
					place: kind || "locality",
					name
				};
				else if (p.class === "shop" || [
					"supermarket",
					"convenience",
					"hairdresser",
					"bakery",
					"clothes"
				].includes(kind)) tags = {
					shop: kind,
					name
				};
				else tags = {
					amenity: kind,
					name
				};
			}
			if (type === "Point") elements.push({
				type: "node",
				id,
				...ll(c),
				tags
			});
			else if (type === "LineString") elements.push({
				type: "way",
				id,
				tags,
				geometry: c.map(ll)
			});
			else if (type === "MultiLineString") c.forEach((line, j) => elements.push({
				type: "way",
				id: id + "-" + j,
				tags,
				geometry: line.map(ll)
			}));
			else if (type === "Polygon") polygon(c, tags, id);
			else if (type === "MultiPolygon") c.forEach((rings, j) => polygon(rings, tags, id + "-" + j));
		}
	}
	return elements;
}
async function fetchVectorDistrict(lat, lon, { fetcher = fetch, radius = 900 } = {}) {
	if (!Number.isFinite(lat) || Math.abs(lat) > 80 || !Number.isFinite(lon) || Math.abs(lon) > 180 || !Number.isFinite(radius) || radius < 100 || radius > 1200) throw Error("Invalid district coordinates/radius");
	const metadata = await fetcher("https://tiles.openfreemap.org/planet", {
		headers: { "User-Agent": UA },
		signal: AbortSignal.timeout(12e3)
	});
	if (!metadata.ok) throw Error("Vector map catalog unavailable");
	const template = (await metadata.json()).tiles?.[0];
	if (typeof template !== "string" || !template.startsWith("https://tiles.openfreemap.org/")) throw Error("Invalid vector tile catalog");
	const z = 14, n = 2 ** z, dx = radius / (111320 * Math.cos(lat * Math.PI / 180)), dy = radius / 111320, xt = (lon) => (lon + 180) / 360 * n, yt = (lat) => (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n, tiles = [];
	for (let x = Math.floor(xt(lon - dx)); x <= Math.floor(xt(lon + dx)); x++) for (let y = Math.floor(yt(lat + dy)); y <= Math.floor(yt(lat - dy)); y++) tiles.push({
		x,
		y
	});
	if (tiles.length > 9) throw Error("Vector district exceeds tile budget");
	const elements = [];
	let bytes = 0;
	for (let i = 0; i < tiles.length; i += 4) {
		const batches = await Promise.all(tiles.slice(i, i + 4).map(async ({ x, y }) => {
			const r = await fetcher(template.replace("{z}", z).replace("{x}", x).replace("{y}", y), {
				headers: { "User-Agent": UA },
				signal: AbortSignal.timeout(12e3)
			});
			if (!r.ok) throw Error("Vector tile unavailable");
			const data = new Uint8Array(await r.arrayBuffer());
			bytes += data.byteLength;
			if (bytes > 8e6) throw Error("Vector district too dense");
			return decodeTile(data, x, y, z);
		}));
		for (const batch of batches) elements.push(...batch);
	}
	if (elements.length > 18e3) throw Error("Vector district too dense");
	return {
		version: .6,
		generator: "OpenFreeMap/OpenMapTiles vector conversion",
		elements,
		warehouse: {
			lat,
			lon,
			radius,
			fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
			provider: "OpenFreeMap",
			tileSource: template,
			tileCount: tiles.length,
			license: "ODbL-1.0",
			attribution: "OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors",
			source: "https://www.openstreetmap.org/copyright",
			towerCoverage: "local vector POIs; no regional Overpass tower query"
		}
	};
}
function attach(origin, { onReady = () => {}, onError = () => {}, ...options } = {}) {
	let dead = false;
	return {
		ready: fetchVectorDistrict(origin.lat, origin.lon, options).then((data) => {
			if (!dead) onReady(data);
			return data;
		}).catch((error) => {
			if (!dead) onError(error);
			throw error;
		}),
		update() {},
		dispose() {
			dead = true;
		}
	};
}
export { attach, decodeTile, fetchVectorDistrict };
