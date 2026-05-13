import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { usePipelineStore } from "../store/pipelineStore";
import { getCode } from "../lib/encoders/index";
import { encodeLDPC, decodeLDPC } from "../lib/encoders/LDPC";
import { applyBSC } from "../lib/channel/channel";
import type { Bit } from "../lib/bitstream/BitArray";

const TRIALS_PER_POINT = 150;

function randomData(k: number): Bit[] {
  return Array.from({ length: k }, () => (Math.random() < 0.5 ? 1 : 0) as Bit);
}

export function BERChart() {
  const { result, codeId } = usePipelineStore();

  const data = useMemo(() => {
    const code = getCode(codeId);
    const points: { p: string; pNum: number; preBER: number; postBER: number }[] = [];
    for (let i = 0; i <= 10; i++) {
      const p = i * 0.05;
      let dataErrors = 0;
      let dataBits = 0;
      for (let t = 0; t < TRIALS_PER_POINT; t++) {
        const u = randomData(code.k);
        const { codeword } = encodeLDPC(code, u);
        const received = applyBSC(codeword, p);
        const dec = decodeLDPC(code, received);
        for (let j = 0; j < code.k; j++) if (dec.data[j] !== u[j]) dataErrors++;
        dataBits += code.k;
      }
      points.push({
        p: p.toFixed(2),
        pNum: p,
        preBER: p,
        postBER: dataBits === 0 ? 0 : dataErrors / dataBits,
      });
    }
    return points;
  }, [codeId]);

  if (!result) return null;

  const code = getCode(codeId);

  return (
    <div className="card space-y-4">
      <div className="card-head">
        <div className="left">
          <span className="eyebrow">tolerancia teórica</span>
          <h2>Curva de <span className="accent">error</span></h2>
          <p className="muted">
            Referencia Monte-Carlo: {TRIALS_PER_POINT.toLocaleString()} bloques aleatorios por punto con {code.label}. Indica hasta cuántos bits alterados por bloque resiste este código.
          </p>
        </div>
      </div>

      <div className="h-[300px] w-full" style={{ minHeight: 300, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <LineChart data={data} margin={{ top: 24, right: 16, bottom: 48, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line-1)" />
            <XAxis
              dataKey="p"
              stroke="var(--tx-3)"
              tick={{ fill: "var(--tx-3)", fontSize: 11 }}
              label={{ value: "fracción de bits alterados por bloque (p)", position: "insideBottom", offset: -12, fill: "var(--tx-3)", fontSize: 11 }}
            />
            <YAxis
              stroke="var(--tx-3)"
              tick={{ fill: "var(--tx-3)", fontSize: 11 }}
              tickFormatter={(v: number) => v.toFixed(2)}
              label={{ value: "BER en los datos", angle: -90, position: "insideLeft", offset: 0, dy: 50, fill: "var(--tx-3)", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--bg-2)", borderColor: "var(--line-2)", color: "var(--tx-1)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "var(--tx-3)" }}
              formatter={((v: unknown) => Number(v).toFixed(4)) as never}
              labelFormatter={(l) => `p = ${l}`}
            />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
            <Line type="monotone" dataKey="preBER" name="sin codificar" stroke="var(--err)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="postBER" name="con LDPC" stroke="var(--signal)" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
