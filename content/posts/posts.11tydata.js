export default {
  layout: "layout.njk",
  eleventyComputed: {
    permalink: (data) => `/posts/${data.page.fileSlug}/`
  }
};
