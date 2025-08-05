/* ==========  src/renderers/phaseSpaceRenderer.js  ========== */
export class PhaseSpaceRenderer {
  constructor(layers, scaleRef){
    this.ctxLine = layers.line;      // layer2
    this.ctxParticle = layers.point; // layer3
    this.scaleRef = scaleRef;        // reactive reference → {value:100}
    this.prevQ = null;
  }

  draw(state){
    const [q1,q2] = state.q;
    const s = this.scaleRef.value;
    const toX = x => s*q1 + this.ctxLine.canvas.width /2;
    const toY = y => this.ctxLine.canvas.height/2 - s*q2;

    if(this.prevQ){
      this.ctxLine.beginPath();
      this.ctxLine.strokeStyle = "#4B0082";
      this.ctxLine.lineWidth = 2;
      this.ctxLine.moveTo(toX(this.prevQ[0]), toY(this.prevQ[1]));
      this.ctxLine.lineTo(toX(q1), toY(q2));
      this.ctxLine.stroke();
    }
    this.prevQ = [q1,q2];

    // particle
    const ctx = this.ctxParticle;
    ctx.clearRect(0,0,ctx.canvas.width, ctx.canvas.height);
    ctx.beginPath();
    ctx.fillStyle="#FFEE91";
    ctx.arc(toX(q1), toY(q2), 6, 0, 2*Math.PI);
    ctx.fill();
  }
}