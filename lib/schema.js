const { z } = require('zod');

const FrontmatterSchema = z.object({
  title: z.string().min(1, "Judul artikel (title) tidak boleh kosong."),
  slug: z.string().optional(),
  description: z.string().optional(),
  labels: z.union([
    z.array(z.string()),
    z.string().transform(val => [val]) // Kadang user nulis string biasa
  ]).optional(),
  status: z.enum(['draft', 'published', 'deleted']).default('draft').catch('draft'),
  date: z.union([z.string(), z.date()]).optional(),
  blog_id: z.string().optional() // Override spesifik untuk multi-blog
});

module.exports = {
  FrontmatterSchema
};
