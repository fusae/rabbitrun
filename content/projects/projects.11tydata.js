export default {
  layout: "detail.njk",
  eleventyComputed: {
    permalink: (data) => `/projects/${data.page.fileSlug}/`
  }
};
