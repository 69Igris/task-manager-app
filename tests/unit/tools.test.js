import { describe, expect, it } from 'vitest';
import { TOOLS, ToolError, toolSpecs, validateToolCall } from '@/lib/ai/tools';

describe('tool allowlist', () => {
  it('exposes exactly the documented tools', () => {
    expect(TOOLS.map((t) => t.name).sort()).toEqual([
      'add_task_comment', 'create_deadline_reminders', 'create_tasks', 'delete_task', 'get_daily_briefing',
      'get_priority_recommendations', 'get_sprint_summary', 'get_task_details', 'list_projects',
      'list_tasks', 'list_team_members', 'update_task', 'update_task_status',
    ]);
  });

  it('produces JSON Schemas with no extra keys allowed', () => {
    for (const spec of toolSpecs()) {
      expect(spec.inputSchema.type).toBe('object');
      expect(spec.inputSchema.additionalProperties).toBe(false);
      expect(spec.inputSchema.$schema).toBeUndefined();
    }
  });

  it('rejects tools outside the allowlist', () => {
    expect(() => validateToolCall('run_mongo_query', { filter: {} })).toThrow(ToolError);
    expect(() => validateToolCall('update_user_role', {})).toThrow(/not available/);
  });

  it('rejects invalid and unexpected arguments with readable messages', () => {
    expect(() => validateToolCall('update_task_status', { taskId: 'abc', status: 'done' })).toThrow(/taskId.*status|Invalid arguments/);
    expect(() => validateToolCall('list_tasks', { status: 'open', $where: '1' })).toThrow(/Invalid arguments/);
    expect(() => validateToolCall('create_tasks', { tasks: [] })).toThrow(/tasks/);
    expect(() => validateToolCall('create_tasks', { tasks: Array.from({ length: 11 }, () => ({ title: 'abc', project: 'P' })) })).toThrow();
  });

  it('accepts and normalizes valid arguments', () => {
    const { tool, args } = validateToolCall('create_tasks', { tasks: [{ title: '  Fix login validation ', project: 'Auth', priority: 'high', dueDate: 'friday' }] });
    expect(tool.kind).toBe('write');
    expect(args.tasks[0].title).toBe('Fix login validation');
  });
});

describe('lenient argument handling for open models', () => {
  it('drops nulls for omitted optional fields and coerces numeric strings', () => {
    const { args } = validateToolCall('list_tasks', { project: null, status: 'open', limit: '5', overdueOnly: 'true' });
    expect(args).toEqual({ status: 'open', limit: 5, overdueOnly: true });
  });

  it('keeps a meaningful null when the schema accepts it', () => {
    const { args } = validateToolCall('update_task', { taskId: 'a'.repeat(24), changes: { dueDate: null } });
    expect(args.changes).toEqual({ dueDate: null });
  });

  it('still rejects arguments that are wrong after normalizing', () => {
    expect(() => validateToolCall('list_tasks', { status: 'finished', project: null })).toThrow(/Invalid arguments/);
    expect(() => validateToolCall('list_tasks', { _unparseable_arguments: '{bad' })).toThrow(/Invalid arguments/);
  });
});
