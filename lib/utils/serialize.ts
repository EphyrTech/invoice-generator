// Utility functions for serializing data for JSON responses

export function serializeDates(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDates);
  }

  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeDates(value);
    }
    return serialized;
  }

  return obj;
}

export function serializeDbResult(result: any[]): any[] {
  return result.map(serializeDates);
}

export function serializeDbRow(row: any): any {
  return serializeDates(row);
}
