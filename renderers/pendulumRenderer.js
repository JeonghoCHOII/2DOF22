/* ===========  src/renderers/pendulumRenderer.js  =========== */
export class PendulumRenderer {
  constructor(canvas, l1, l2){
    this.ctx = canvas.getContext("2d");
    this.l1 = l1; this.l2 = l2; this.SCALE = 100;
  }
  draw(state){
    const [th1, th2] = state.q;
    const ctx = this.ctx;
    const {width:w, height:h}=ctx.canvas;
    ctx.clearRect(0,0,w,h);
    const pivot = [w/2, h/2];
    const x1 = pivot[0] + this.l1*this.SCALE*Math.sin(th1);
    const y1 = pivot[1] + this.l1*this.SCALE*Math.cos(th1);
    const x2 = x1 + this.l2*this.SCALE*Math.sin(th2);
    const y2 = y1 + this.l2*this.SCALE*Math.cos(th2);
    ctx.beginPath();ctx.moveTo(...pivot);ctx.lineTo(x1,y1);ctx.lineTo(x2,y2);
    ctx.stroke();
  }
}