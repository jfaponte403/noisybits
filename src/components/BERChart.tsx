import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { usePipelineStore } from "../store/pipelineStore";
import { getCode } from "../lib/encoders/index";

export function BERChart() {
  const { result, codeId } = usePipelineStore();

  const data = useMemo(() => {
    const code = getCode(codeId);
    const points = [];
    for (let p = 0; p <= 0.5; p += 0.05) {
      let postBER = 0;
      if (code.algorithm === 'ldpc') {
          // LDPC is very good
          postBER = Math.pow(p, 3) * 3; // rough approximation
      }
      
      points.push({
        p: p.toFixed(2),
        preBER: p,
        postBER: Math.min(p, postBER)
      });
    }
    return points;
  }, [codeId]);

  if (!result) return null;

  return (
    <div className="card space-y-4">
      <div className="card-head">
        <div className="left">
          <span className="eyebrow">Rendimiento</span>
          <h2>Curva de <span className="accent">Error</span> (Teórica)</h2>
        </div>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line-1)" />
            <XAxis 
                dataKey="p" 
                stroke="var(--tx-3)" 
                label={{ value: 'Probabilidad p (Canal)', position: 'insideBottom', offset: -5, fill: 'var(--tx-3)' }} 
            />
            <YAxis 
                stroke="var(--tx-3)" 
                label={{ value: 'BER', angle: -90, position: 'insideLeft', fill: 'var(--tx-3)' }} 
            />
            <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--line-2)', color: 'var(--tx-1)' }}
                itemStyle={{ color: 'var(--signal)' }}
            />
            <Legend />
            <Line type="monotone" dataKey="preBER" name="Sin Codificación" stroke="var(--err)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="postBER" name="Con Codificación" stroke="var(--signal)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
