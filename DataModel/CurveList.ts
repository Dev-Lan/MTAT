import { DevlibAlgo } from '../lib/DevlibAlgo';
import { CurveND } from './CurveND';
import { PointND } from './PointND';
import { PointCollection } from './PointCollection';
import { CurveListIterator } from './CurveListIterator';

export class CurveList extends PointCollection
{

	constructor(curveList: CurveND[])
	{
		super();
		this._curveList = curveList;
		this._length = 0;
		let i = 0;
		for (let curve of this.curveList)
		{
			this._length += curve.length;
			for (let point of curve)
			{
				this[i] = point;
				++i;
			}
		}
		this._minMaxMap = new Map<string, [number, number]>();
	}

	private _curveList : CurveND[];
	public get curveList() : CurveND[] {
		return this._curveList;
	}

	private _inputKey : string;
	public get inputKey() : string {
		return this._inputKey;
	}

	private _minMaxMap : Map<string, [number, number]>;
	public get minMaxMap() : Map<string, [number, number]> {
		if (this._minMaxMap.size === 0)
		{
			this.updateMinMaxMap()
		}
		return this._minMaxMap;
	}

	private updateMinMaxMap()
	{
		for (let curve of this.curveList)
		{
			for (let point of curve.pointList)
			{
				for (let [key, value] of point.valueMap)
				{
					let currentVal = this._minMaxMap.get(key);
					let pointVal = point.get(key);
					if (typeof currentVal === "undefined")
					{
						this._minMaxMap.set(key, [pointVal, pointVal]);
						continue;
					}
					let [c1, c2] = currentVal;
					let newVal: [number, number] = [Math.min(c1, pointVal), Math.max(c2, pointVal)];
					this._minMaxMap.set(key, newVal);
				}
			}
		}
	}

	private initValue(key: string, value: number): void
	{
		for (let curve of this.curveList)
		{
			curve.set(key, value);
		}
	}

	private isKeySet(key: string): boolean
	{
		for (let curve of this.curveList)
		{
			let value: number | undefined = curve.get(key);
			if (typeof value === "undefined")
			{
				return false;
			}
		}
		return true;
	}

	public setInputKey(key: string): void
	{
		this._inputKey = key;
		for (let curve of this.curveList)
		{
			curve.sort(key);
		}
	}

	public sort(key: string, ascend: boolean = true): void
	{
		let sortFunction = DevlibAlgo.sortOnProperty<CurveND>((curve: CurveND) => 
		{
			return curve.get(key);
		}, ascend);
		this.curveList.sort(sortFunction);
	}

	public getPointsAtInput(inputValue: number): PointND[]
	{
		let pointList: PointND[] = [];
		for (let curve of this.curveList)
		{
			let point = curve.getPoint(inputValue);
			// console.log(point);
			if (point)
			{
				pointList.push(point);
			}
		}

		return pointList;
	}

	public calculateDepth(depthKey: string, valueKey: string): void
	{
		if (this.isKeySet(depthKey))
		{
			// depth is already set
			return;
		}
		this.initValue(depthKey, 0);

		const allBands = CurveList.getAllPossible2Bands(this.curveList) as [CurveND, CurveND][];
		for (let band of allBands)
		{
			for (let curve of this.curveList)
			{
				const depthContribution = this.getDepthContribution(curve, band, valueKey);
				const oldDepth = curve.get(depthKey);
				curve.set(depthKey, oldDepth + depthContribution);
			}
		}

		// todo - normalize

	}

	private getDepthContribution(curve: CurveND, [b1, b2]: [CurveND, CurveND], valueKey: string): number
	{
		let depth = 0;
		for (let i = 0; i < curve.pointList.length; i++)
		{
			let point: PointND = curve.pointList[i];
			const t = point.get(this.inputKey);
			let thisVal = point.get(valueKey);
			let b1Val = b1.getPointValue(t, valueKey);
			let b2Val = b2.getPointValue(t, valueKey);
			let minVal = Math.min(b1Val, b2Val);
			let maxVal = Math.max(b1Val, b2Val);
			if (minVal <= thisVal && thisVal <= maxVal)
			{
				const weight = curve.getPointWeight(i);
				depth += weight;
			}
		}
		return depth;
	}

	static getAllPossible2Bands(list: any[]): [any, any][]
	{
		const bandList: [any, any][] = [];
		for (let i = 0; i < list.length; i++)
		{
			for (let j = i + 1; j < list.length; j++)
			{
				let b: [any, any] = [list[i], list[j]];
				bandList.push(b);
			}
		}
		return bandList
	}

	[Symbol.iterator](): Iterator<PointND>
	{
		return new CurveListIterator(this.curveList);
	}

}