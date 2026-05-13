import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceDot } from "recharts";
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
  const { result, codeId, mode } = usePipelineStore();

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
  // Where this run sits on the channel axis (decode mode only).
  const livePre = mode === "decode" ? result.metrics.berPreDecode : null;

  return (
    <div className="card space-y-4">
      <div className="card-head">
        <div className="left">
          <span className="eyebrow">rendimiento</span>
          <h2>Curva de <span className="accent">error</span></h2>
          <p className="muted">
            Simulación Monte-Carlo: {TRIALS_PER_POINT.toLocaleString()} bloques aleatorios por punto, código {code.label}, canal BSC.
          </p>
        </div>
      </div>

      <div className="h-[300px] w-full" style={{ minHeight: 300, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 16, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line-1)" />
            <XAxis
              dataKey="p"
              stroke="var(--tx-3)"
              tick={{ fill: "var(--tx-3)", fontSize: 11 }}
              label={{ value: "probabilidad de error del canal (p)", position: "insideBottom", offset: -8, fill: "var(--tx-3)", fontSize: 11 }}
            />
            <YAxis
              stroke="var(--tx-3)"
              tick={{ fill: "var(--tx-3)", fontSize: 11 }}
              tickFormatter={(v: number) => v.toFixed(2)}
              label={{ value: "BER en los datos", angle: -90, position: "insideLeft", fill: "var(--tx-3)", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--bg-2)", borderColor: "var(--line-2)", color: "var(--tx-1)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "var(--tx-3)" }}
              formatter={((v: unknown) => Number(v).toFixed(4)) as never}
              labelFormatter={(l) => `p = ${l}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="preBER" name="sin codificar" stroke="var(--err)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="postBER" name="con LDPC" stroke="var(--signal)" strokeWidth={2} dot={{ r: 2 }} />
            {livePre !== null && (
              <ReferenceDot x={(Math.round(livePre / 0.05) * 0.05).toFixed(2)} y={livePre} r={4} fill="var(--warn)" stroke="var(--bg-1)" ifOverflow="extendDomain" label={{ value: "tu ejecución", position: "top", fill: "var(--warn)", fontSize: 10 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
