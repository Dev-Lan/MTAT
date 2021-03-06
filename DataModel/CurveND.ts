import { Metric } from './Metric';
import { PointND } from './PointND';
import { DevlibMath } from '../lib/DevlibMath';
import { DevlibAlgo } from '../lib/DevlibAlgo';
import { PointCollection } from './PointCollection';
import { CurveIterator } from './CurveIterator';

export class CurveND extends PointCollection {
	
	constructor(id: string) {
		super();
		this._id = id;
		this._valueMap = new Map<string, Metric>();
		this._pointList = [];
	}

	private _id : string;
	public get id() : string {
		return this._id;
	}

	private _inputKey : string;
	public get inputKey() : string {
		return this._inputKey;
	}

	private _valueMap : Map<string, Metric>;
	public get valueMap() : Map<string, Metric> {
		return this._valueMap;
	}

	private _pointList : PointND[];
	public get pointList() : PointND[] {
		return this._pointList;
	}

	public set(key: string, value: number): void
	{
		const m = new Metric(value);
		this._valueMap.set(key, m);
	}

	public get(key: string): number | undefined
	{
		let metric = this.valueMap.get(key);
		if (metric)
		{
			return metric.value;
		}
		return undefined;
	}

	// finds the value of the property with given key. Will interpolate.
	public getPointValue(inputValue: number, outputKey: string): number | undefined
	{
		let sortFunction = DevlibAlgo.compareProperty<PointND>(inputValue, (point: PointND) => 
		{
			return point.get(this.inputKey);
		});
		let pointIndex: number | [number, number];
		pointIndex = DevlibAlgo.BinarySearchIndex(this.pointList, sortFunction);

		if (typeof pointIndex === "number")
		{
			return this.pointList[pointIndex].get(outputKey);
		}
		const [idx1, idx2] = pointIndex;
		if (idx1 === undefined || idx2 === undefined)
		{
			// out of bounds
			return undefined;
		}
		const point1 = this.pointList[idx1];
		const point2 = this.pointList[idx2];

		const val1 = point1.get(outputKey);
		const val2 = point2.get(outputKey);

		const t1 = point1.get(this.inputKey);
		const t2 = point2.get(this.inputKey);

		const tDiff = t2 - t1;
		const portion = (inputValue - t1) / tDiff;
		const valDiff = val2 - val1;

		return val1 + valDiff * portion;
	}

	// finds point at given input time. Will construct a new point and interpolate all values if it is between points
	public getPoint(inputValue: number): PointND
	{
		let sortFunction = DevlibAlgo.compareProperty<PointND>(inputValue, (point: PointND) => 
		{
			return point.get(this.inputKey);
		});
		let pointIndex: number | [number, number];
		pointIndex = DevlibAlgo.BinarySearchIndex(this.pointList, sortFunction);
		if (typeof pointIndex === "number")
		{
			return this.pointList[pointIndex];
		}
		const [idx1, idx2] = pointIndex;
		if (idx1 === undefined || idx2 === undefined)
		{
			// out of bounds
			return undefined;
		}
		const point1 = this.pointList[idx1];
		const point2 = this.pointList[idx2];

		const t1 = point1.get(this.inputKey);
		const t2 = point2.get(this.inputKey);

		const tDiff = t2 - t1;
		const portion = (inputValue - t1) / tDiff;

		let interpolatedPoint = new PointND();
		interpolatedPoint.addValue(this.inputKey, inputValue);

		for (let [key, metric] of point1.valueMap)
		{
			let val1 = point1.get(key);
			let val2 = point2.get(key);
			let valDiff = val2 - val1;
			interpolatedPoint.addValue(key, val1 + valDiff * portion);
		}
		interpolatedPoint.inBrush = point1.inBrush && point2.inBrush;
		return interpolatedPoint;
	}

	public getPointWeight(pointIndex: number): number
	{
		const idxLeft = Math.max(pointIndex - 1, 0);
		const idxRight = Math.min(pointIndex + 1, this.pointList.length - 1);
		const tLeft = this.pointList[idxLeft].get(this.inputKey);
		const tRight = this.pointList[idxRight].get(this.inputKey);
		return (tRight - tLeft ) / 2;
	}

	public addPoint(point: PointND): void
	{
		this._pointList.push(point);
		this[this.length] = point;
		++this._length;
	}

	public sort(key: string): void
	{
		let sortFunction = DevlibAlgo.sortOnProperty<PointND>((point: PointND) => 
		{
			return point.get(key);
		});
		this.pointList.sort(sortFunction);
		this._inputKey = key;
	}

	[Symbol.iterator](): Iterator<PointND>
	{
		return new CurveIterator(this.pointList);
	}

}