export class SoftLogic {
	public static encodeGenotype(weights: number[][][]): number[] {
		const flatten = (arr: any[]) => arr.reduce((p: number[], c) => Array.isArray(c) ? p.concat(flatten(c)) : p.concat([c]), []);
		return flatten(weights);
	}

	private static networkSize(inputs: number, hiddenLayers: number[], outputs: number) {
		var inputSizes = [inputs].concat(hiddenLayers).map(v => v + 1);
		var layerSizes = hiddenLayers.concat([outputs]);
		var segmentSizes = inputSizes.map((v, i) => v * layerSizes[i]);

		return {
			inputSizes: inputSizes,
			layerSizes: layerSizes,
			segmentSizes: segmentSizes
		};
	}

	public static decodeGenotype(inputs: number, hiddenLayers: number[], outputs: number, genotype: number[]): number[][][] {
		var size = SoftLogic.networkSize(inputs, hiddenLayers, outputs);

		function splitArray<U>(arr: Array<U>, chunks: number[]) {
			return chunks.reduce<{ begin: number, end: number }[]>((p, c, i) => p.concat({ begin: i ? p[i - 1].end : 0, end: (i ? p[i - 1].end : 0) + c }), []).map(v => arr.slice(v.begin, v.end));
		}

		return splitArray(genotype, size.segmentSizes).map((v, i) => splitArray(v, Array<number>(size.layerSizes[i]).fill(size.inputSizes[i])));
	}

	public static genotypeLength(inputs: number, hiddenLayers: number[], outputs: number): number {
		var size = SoftLogic.networkSize(inputs, hiddenLayers, outputs);

		return size.segmentSizes.reduce((p, c) => p + c, 0);
	}
}