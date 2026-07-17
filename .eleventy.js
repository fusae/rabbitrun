import { HtmlBasePlugin } from "@11ty/eleventy";
import pluginRss from "@11ty/eleventy-plugin-rss";

const site = {
  title: "rabbitrun",
  url: process.env.SITE_URL || "https://fusae.github.io"
};

function byDateDesc(a, b) {
  return new Date(b.data.date || b.date) - new Date(a.data.date || a.date);
}

function projectUrl(project) {
  return `/projects/${project.fileSlug}/`;
}

function postUrl(post) {
  return `/posts/${post.fileSlug}/`;
}

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.ignores.add("drafts/**");
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.addPassthroughCopy({ "content/posts/images": "images" });

  eleventyConfig.addGlobalData("site", site);

  const pathPrefixUrl = eleventyConfig.getFilter("url");
  eleventyConfig.addFilter("siteUrl", (url) => new URL(pathPrefixUrl(url), site.url).toString());
  eleventyConfig.addFilter("htmlDateString", (dateObj) => {
    return new Date(dateObj).toISOString().slice(0, 10);
  });
  eleventyConfig.addFilter("sourceLabel", (source) => {
    return {
      wechat: "公众号",
      x: "X",
      zhihu: "知乎"
    }[source] || source;
  });

  eleventyConfig.addCollection("projects", (collectionApi) => {
    return collectionApi.getFilteredByGlob("content/projects/*.md").sort((a, b) => {
      return (b.data.year || 0) - (a.data.year || 0) || a.data.title.localeCompare(b.data.title);
    });
  });

  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi.getFilteredByGlob("content/posts/*.md").sort(byDateDesc);
  });

  eleventyConfig.addTemplate(
    "llms.njk",
    `# rabbitrun

## Projects
{% for project in collections.projects -%}
- {{ project.data.title }} | {{ project | projectUrl | url }} | {{ project.data.year }}
{% endfor %}

## Posts
{% for post in collections.posts -%}
- {{ post.data.title }} | {{ post | postUrl | url }} | {{ post.data.date | htmlDateString }}
{% endfor %}
`,
    {
      permalink: "llms.txt"
    }
  );

  eleventyConfig.addFilter("projectUrl", projectUrl);
  eleventyConfig.addFilter("postUrl", postUrl);

  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk"]
  };
}
