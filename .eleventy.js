import pluginRss from "@11ty/eleventy-plugin-rss";

const site = {
  title: "rabbitrun",
  url: "https://rabbitrun.run"
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

  eleventyConfig.addGlobalData("site", site);

  eleventyConfig.addFilter("absoluteUrl", (url) => new URL(url, site.url).toString());
  eleventyConfig.addFilter("htmlDateString", (dateObj) => {
    return new Date(dateObj).toISOString().slice(0, 10);
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
- {{ project.data.title }} | {{ project | projectUrl }} | {{ project.data.year }}
{% endfor %}

## Posts
{% for post in collections.posts -%}
- {{ post.data.title }} | {{ post | postUrl }} | {{ post.data.date | htmlDateString }}
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
