// 정의역을 n차원 벡로 받는 함수 f(x)에 관한 미분	
export function gradient(f, x, h = 1e-4) {
	const n = x.length;	//x는 배열임.
	const grad = new Array(n).fill(0);
	for (let i = 0; i < n; i++) {
		const xForward = x.slice();
		const xBackward = x.slice();
		xForward[i] += h;
		xBackward[i] -= h;
		grad[i] = (f(xForward) - f(xBackward)) / (2 * h);
	}
	return grad;
}

export function hessian(f, x, h = 1e-4) {
	const n = x.length;	//x는 배열임.
	const H = Array.from({ length: n }, () => new Array(n).fill(0));
	const f0 = f(x);

	// 대각성분
	for (let i = 0; i < n; i++) {
		const xiF = x.slice();
		xiF[i] += h;
		const xiB = x.slice();
		xiB[i] -= h;
		H[i][i] = ( f(xiF) - 2 * f0 + f(xiB) ) / (h * h);
	}

	//비대각성분
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			const xp = x.slice();
			xp[i] += h; xp[j] += h;
			const xm = x.slice();
			xm[i] -= h; xm[j] -= h;

			const xij1 = xp;
			const xij2 = x.slice();
			xij2[i] += h; xij2[j] -= h;
			const xij3 = x.slice();
			xij3[i] -= h; xij3[j] += h;
			const xij4 = xm;
			H[i][j] = H[j][i] = (f(xij1) - f(xij2) - f(xij3) + f(xij4)) / (4*h*h);
		}
	}
	return H;
}

// Richardson 외삽법 적용
export function gradientRE(f, x, h = 1e-4) {
	const n = x.length;	//x는 배열임.
	const grad = new Array(n).fill(0);
	for (let i = 0; i < n; i++) {
		const xForward1 = x.slice();
		const xBackward1 = x.slice();
		xForward1[i] += h;
		xBackward1[i] -= h;
		const D1 = (f(xForward1) - f(xBackward1)) / (2 * h);

		const xForward2 = x.slice();
		const xBackward2 = x.slice();
		xForward2[i] += h/2;
		xBackward2[i] -= h/2;
		const D2 = (f(xForward2) - f(xBackward2)) / h;

		grad[i] = (4 * D2 - D1) / 3;
	}
	return grad;
}

export function hessianRE(f, x, h = 1e-4) {
	const n = x.length;	//x는 배열임.
	const H = Array.from( { length: n }, () => new Array(n).fill(0));
	const f0 = f(x);

	// 대각성분
	for (let i = 0; i < n; i++) {
		const xiF1 = x.slice();
		xiF1[i] += h;
		const xiB1 = x.slice();
		xiB1[i] -= h;
		const Hii1 = ( f(xiF1) - 2 * f0 + f(xiB1) ) / (h * h);

		const xiF2 = x.slice();
		xiF2[i] += h/2;
		const xiB2 = x.slice();
		xiB2[i] -= h/2;
		const Hii2 = ( f(xiF2) - 2 * f0 + f(xiB2) ) / ((h*h)/4);
		
		H[i][i] = (4 * Hii2 - Hii1) / 3;
	}

	//비대각성분
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			const xp1 = x.slice();
			xp1[i] += h; xp1[j] += h;
			const xm1 = x.slice();
			xm1[i] -= h; xm1[j] -= h;

			const xij11 = xp1;
			const xij21 = x.slice();
			xij21[i] += h; xij21[j] -= h;
			const xij31 = x.slice();
			xij31[i] -= h; xij31[j] += h;
			const xij41 = xm1;
			const Hij1 = H[j][i] = (f(xij11) - f(xij21) - f(xij31) + f(xij41)) / (4*h*h);

			const xp2 = x.slice();
			xp2[i] += h/2; xp2[j] += h/2;
			const xm2 = x.slice();
			xm2[i] -= h/2; xm2[j] -= h/2;

			const xij12 = xp2;
			const xij22 = x.slice();
			xij22[i] += h/2; xij22[j] -= h/2;
			const xij32 = x.slice();
			xij32[i] -= h/2; xij32[j] += h/2;
			const xij42 = xm2;
			const Hij2 = H[j][i] = (f(xij12) - f(xij22) - f(xij32) + f(xij42)) / (h*h);

			H[i][j] = H[j][i] = (4 * Hij2 - Hij1) / 3;
		}
	}
	return H;
}
