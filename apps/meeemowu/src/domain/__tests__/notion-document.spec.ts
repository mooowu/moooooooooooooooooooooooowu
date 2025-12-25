import { describe, expect, it } from 'vitest';
import { NotionDocument } from '../notion-document';

describe('NotionDocument', () => {
  describe('fromWebhookData', () => {
    it('should create document with basic properties', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        parent: { type: 'database', database_id: 'db-456' },
        properties: {
          Title: { type: 'title', title: [{ plain_text: 'Test Title' }] },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.id).toBe('page-123');
      expect(document.parentType).toBe('database');
      expect(document.parentId).toBe('db-456');
      expect(document.content).toBe('Title: Test Title');
    });

    it('should use page_id when parent is page', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        parent: { type: 'page', page_id: 'parent-page-789' },
        properties: {},
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.parentId).toBe('parent-page-789');
    });

    it('should handle missing parent', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {},
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.parentType).toBeUndefined();
      expect(document.parentId).toBeUndefined();
    });
  });

  describe('hasContent', () => {
    it('should return true when content exists', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Title: { type: 'title', title: [{ plain_text: 'Test' }] },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.hasContent()).toBe(true);
    });

    it('should return false when content is empty', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {},
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.hasContent()).toBe(false);
    });

    it('should return false when extracted values are empty', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Title: { type: 'title', title: [] },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.hasContent()).toBe(false);
    });
  });

  describe('toPayload', () => {
    it('should return correct payload structure', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        parent: { type: 'database', database_id: 'db-456' },
        properties: {
          Title: { type: 'title', title: [{ plain_text: 'Test' }] },
        },
      };

      const document = NotionDocument.fromWebhookData(data);
      const payload = document.toPayload();

      expect(payload).toEqual({
        pageId: 'page-123',
        parentType: 'database',
        parentId: 'db-456',
        content: 'Title: Test',
      });
    });
  });

  describe('property extraction', () => {
    it('should extract title property', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Name: { type: 'title', title: [{ plain_text: 'Hello' }, { plain_text: ' World' }] },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.content).toBe('Name: Hello World');
    });

    it('should extract rich_text property', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Description: { type: 'rich_text', rich_text: [{ plain_text: 'Some description' }] },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.content).toBe('Description: Some description');
    });

    it('should extract number property', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Count: { type: 'number', number: 42 },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.content).toBe('Count: 42');
    });

    it('should extract select property', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Status: { type: 'select', select: { name: 'Active' } },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.content).toBe('Status: Active');
    });

    it('should extract multi_select property', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Tags: { type: 'multi_select', multi_select: [{ name: 'Tag1' }, { name: 'Tag2' }] },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.content).toBe('Tags: Tag1, Tag2');
    });

    it('should extract date property with start only', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Date: { type: 'date', date: { start: '2025-01-01' } },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.content).toBe('Date: 2025-01-01');
    });

    it('should extract date property with start and end', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Period: { type: 'date', date: { start: '2025-01-01', end: '2025-12-31' } },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.content).toBe('Period: 2025-01-01 - 2025-12-31');
    });

    it('should extract checkbox property as Yes', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Done: { type: 'checkbox', checkbox: true },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.content).toBe('Done: Yes');
    });

    it('should extract checkbox property as No', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Done: { type: 'checkbox', checkbox: false },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.content).toBe('Done: No');
    });

    it('should extract url property', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Website: { type: 'url', url: 'https://example.com' },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.content).toBe('Website: https://example.com');
    });

    it('should extract email property', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Email: { type: 'email', email: 'test@example.com' },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.content).toBe('Email: test@example.com');
    });

    it('should extract phone_number property', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Phone: { type: 'phone_number', phone_number: '+1-234-567-8900' },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.content).toBe('Phone: +1-234-567-8900');
    });

    it('should combine multiple properties', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Title: { type: 'title', title: [{ plain_text: 'My Page' }] },
          Status: { type: 'select', select: { name: 'Active' } },
          Count: { type: 'number', number: 10 },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.content).toContain('Title: My Page');
      expect(document.content).toContain('Status: Active');
      expect(document.content).toContain('Count: 10');
    });

    it('should skip unsupported property types', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Title: { type: 'title', title: [{ plain_text: 'Test' }] },
          Unknown: { type: 'unknown_type', value: 'something' },
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.content).toBe('Title: Test');
    });

    it('should skip null and non-object values', () => {
      const data = {
        object: 'page',
        id: 'page-123',
        properties: {
          Title: { type: 'title', title: [{ plain_text: 'Test' }] },
          Null: null,
          String: 'invalid',
        },
      };

      const document = NotionDocument.fromWebhookData(data);

      expect(document.content).toBe('Title: Test');
    });
  });
});
