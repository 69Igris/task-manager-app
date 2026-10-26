/**
 * A deterministic stand-in for the LLM. Each script step receives what the
 * model would see (tool results, history) and returns the model's next move.
 */
export function scriptedProvider(steps) {
  const calls = [];
  let index = 0;
  const provider = {
    name: 'scripted',
    calls,
    startTurn({ system, tools, history, userMessage }) {
      const turnCall = { system, tools, history, userMessage, toolResults: [] };
      calls.push(turnCall);
      return {
        async next(toolResults = []) {
          turnCall.toolResults.push(toolResults);
          const step = steps[Math.min(index, steps.length - 1)];
          index += 1;
          const out = typeof step === 'function' ? await step({ toolResults, history, userMessage, call: index }) : step;
          if (out instanceof Error) throw out;
          return { text: '', toolCalls: [], stopReason: 'end_turn', usage: {}, ...out };
        },
      };
    },
  };
  return provider;
}

let seq = 0;
export const toolCall = (name, input) => ({ id: `toolu_${++seq}`, name, input });
export const callTools = (...calls) => ({ toolCalls: calls, stopReason: 'tool_use' });
export const answer = (text) => ({ text, stopReason: 'end_turn' });
export const parseResult = (r) => JSON.parse(r.content);
