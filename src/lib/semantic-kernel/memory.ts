/**
 * Interface for memory operations
 */
export interface Memory {
  /**
   * Save information to memory
   */
  saveInformation(
    collection: string,
    key: string,
    information: string,
    description?: string
  ): Promise<string>;

  /**
   * Retrieve information from memory
   */
  retrieveInformation(
    collection: string,
    key: string
  ): Promise<MemoryRecord | undefined>;

  /**
   * Search for information in memory
   */
  searchInformation(
    collection: string,
    query: string,
    limit?: number
  ): Promise<MemoryRecord[]>;
}

/**
 * Represents a record in memory
 */
export interface MemoryRecord {
  id: string;
  key: string;
  information: string;
  description?: string;
  embedding?: number[];
}

/**
 * Simple in-memory implementation of Memory
 */
export class InMemoryMemory implements Memory {
  private collections: Record<string, Record<string, MemoryRecord>>;

  constructor() {
    this.collections = {};
  }

  async saveInformation(
    collection: string,
    key: string,
    information: string,
    description?: string
  ): Promise<string> {
    if (!this.collections[collection]) {
      this.collections[collection] = {};
    }

    const memoryRecord: MemoryRecord = {
      id: `${collection}-${key}`,
      key,
      information,
      description,
    };

    this.collections[collection][key] = memoryRecord;

    return memoryRecord.id;
  }

  async retrieveInformation(
    collection: string,
    key: string
  ): Promise<MemoryRecord | undefined> {
    if (!this.collections[collection]) {
      return undefined;
    }

    return this.collections[collection][key];
  }

  async searchInformation(
    collection: string,
    query: string,
    limit: number = 10
  ): Promise<MemoryRecord[]> {
    if (!this.collections[collection]) {
      return [];
    }

    // Simple implementation: just look for substring matches
    const records = Object.values(this.collections[collection]).filter(
      (record) =>
        record.information.toLowerCase().includes(query.toLowerCase()) ||
        (record.description &&
          record.description.toLowerCase().includes(query.toLowerCase()))
    );

    return records.slice(0, limit);
  }
}
