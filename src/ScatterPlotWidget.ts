import * as d3 from 'd3';
import {SvgSelection} from '../lib/DevLibTypes';
import {BaseWidget} from './BaseWidget';
import {PointCollection} from '../DataModel/PointCollection';
import {PointND} from '../DataModel/PointND';
import {valueFilter} from '../DataModel/PointCollection';

export class ScatterPlotWidget extends BaseWidget<PointCollection> {
	
	constructor(container: HTMLElement, xKey: string, yKey: string)
	{
		super(container);
		this._xKey = xKey;
		this._yKey = yKey;
		this.setLabel();
	}

	private _xKey : string;
	public get xKey() : string {
		return this._xKey;
	}

	private _yKey : string;
	public get yKey() : string {
		return this._yKey;
	}

	private _svgSelect : SvgSelection;
	public get svgSelect() : SvgSelection {
		return this._svgSelect;
	}

	private _mainGroupSelect : SvgSelection;
	public get mainGroupSelect() : SvgSelection {
		return this._mainGroupSelect;
	}

	private _brushGroupSelect : SvgSelection;
	public get brushGroupSelect() : SvgSelection {
		return this._brushGroupSelect;
	}

	private _xAxisGroupSelect : SvgSelection;
	public get xAxisGroupSelect() : SvgSelection {
		return this._xAxisGroupSelect;
	}

	private _xLabelTextSelect : SvgSelection;
	public get xLabelTextSelect() : SvgSelection {
		return this._xLabelTextSelect;
	}


	private _yAxisGroupSelect : SvgSelection;
	public get yAxisGroupSelect() : SvgSelection {
		return this._yAxisGroupSelect;
	}

	private _yLabelTextSelect : SvgSelection;
	public get yLabelTextSelect() : SvgSelection {
		return this._yLabelTextSelect;
	}

	private _scaleX : d3.ScaleLinear<number, number>;
	public get scaleX() : d3.ScaleLinear<number, number> {
		return this._scaleX;
	}

	private _scaleY : d3.ScaleLinear<number, number>;
	public get scaleY() : d3.ScaleLinear<number, number> {
		return this._scaleY;
	}

	private _axisPadding :  number;
	public get axisPadding() :  number {
		return this._axisPadding;
	}

	private _brush : d3.BrushBehavior<any>;
	public get brush() : d3.BrushBehavior<any> {
		return this._brush;
	}

	protected setMargin(): void
	{
		this._margin = {
			top: 8,
			right: 8,
			bottom: 56,
			left: 56
		}
	}

	public init(): void
	{
		// console.log(this);
		this._svgSelect = d3.select(this.container).append("svg")
			.attr("width", this.width)
			.attr("height", this.height);

		this._mainGroupSelect = this.svgSelect.append("g")
			.attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
		
		this._brushGroupSelect = this.svgSelect.append("g")
			.attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
			.classed("brushContainer", true);

		this._axisPadding = 0;

		this._xAxisGroupSelect = this.svgSelect.append('g')
			.attr('transform', `translate(${this.margin.left}, ${this.margin.top + this.vizHeight + this.axisPadding})`)
			.classed("labelColor", true);

		this._yAxisGroupSelect = this.svgSelect.append('g')
			.attr('transform', `translate(${this.margin.left - this.axisPadding}, ${this.margin.top})`)
			.classed("labelColor", true);

		this._brush = d3.brush()
			.extent([[0, 0], [this.vizWidth, this.vizHeight]])
			.on("start brush end", () => { this.brushHandler() });
	
		this.brushGroupSelect.call(this.brush);
	}

	private setLabel(): void
	{
		const bufferForAxis = 32 + this.axisPadding;
		this._xLabelTextSelect = this.svgSelect.append('text')
			.attr('transform', `translate(${this.margin.left + this.vizWidth / 2}, ${this.margin.top + this.vizHeight + bufferForAxis})`)
			.classed('axisLabel', true)
			.classed('labelColor', true)
			.text(this.xKey);

		let transX = this.margin.left - bufferForAxis;
		let transY = this.margin.top + this.vizHeight / 2;
		let transformText: string;
		if (this.yKey.length === 1)
		{
			transformText = `translate(${transX}, ${transY})`;
		}
		else
		{
			transformText = `rotate(-90) translate(${-transY}, ${transX})`;
		}

		this._yLabelTextSelect = this.svgSelect.append('text')
			.attr('transform', transformText)
			.classed('axisLabel', true)
			// .classed('verticalLabel', true)
			.classed('labelColor', true)
			.text(this.yKey);

		// console.log(this.yLabelTextSelect);
	}

	public OnDataChange()
	{
		this.updateScales();
		// console.log("on data change...");
		this.mainGroupSelect.selectAll("circle")
			.data<PointND>(this.data.Array)
		  .join("circle")
			.attr("cx", d => this.scaleX(d.get(this.xKey)))
			.attr("cy", d => this.scaleY(d.get(this.yKey)))
			.classed("scatterPoint", true)
			.classed("noDisp", d => !d.inBrush);

		this.drawAxis();
	}

	private updateScales(): void
	{
		let minMaxX = this.data.getMinMax(this.xKey);
		this._scaleX = d3.scaleLinear()
			.domain(minMaxX)
			.range([0, this.vizWidth]);

		let minMaxY = this.data.getMinMax(this.yKey);
		this._scaleY = d3.scaleLinear()
			.domain(minMaxY)
			.range([this.vizHeight, 0]);
	}

	private drawAxis(): void
	{
		this.xAxisGroupSelect
			.call(d3.axisBottom(this.scaleX).ticks(5));

		this.yAxisGroupSelect
			.call(d3.axisLeft(this.scaleY).ticks(5));
	}

	protected OnResize(): void
	{
		// resize is handled by css / HTML
	}

	private brushHandler():  void
	{
		const selection: [[number, number], [number, number]] | null  | undefined = d3.event.selection;
		if (typeof selection === "undefined" || selection === null)
		{
			this.data.removeBrush(this.getUniqueKey());
			return;
		}
		let [[left, top], [right, bottom]] = selection;
		
		let minX = this.scaleX.invert(left);
		let maxX = this.scaleX.invert(right);
		let xValueFilter: valueFilter = {
			key: this.xKey,
			bound: [minX, maxX]
		}

		let minY = this.scaleY.invert(bottom);
		let maxY = this.scaleY.invert(top);
		let yValueFilter: valueFilter = {
			key: this.yKey,
			bound: [minY, maxY]
		}

		this.data.addBrush(this.getUniqueKey(), xValueFilter, yValueFilter);
	}

	private getUniqueKey(): string
	{
		return this.constructor.name + "." + this.xKey + "." + this.yKey;
	}

	public OnBrushChange(): void
	{
		if (this.container.classList.contains("noDisp"))
		{
			return;
		}

		// hide dynamically
		this.mainGroupSelect.selectAll("circle")
			.data<PointND>(this.data.Array)
		  .join("circle")
			.classed("noDisp", d => !d.inBrush);
	}

}