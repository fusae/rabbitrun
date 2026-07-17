export default {
  layout: "layout.njk",
  eleventyComputed: {
    permalink: (data) => `/projects/${data.page.fileSlug}/`
  }
};
