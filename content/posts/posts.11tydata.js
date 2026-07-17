export default {
  layout: "detail.njk",
  eleventyComputed: {
    permalink: (data) => `/posts/${data.page.fileSlug}/`
  }
};
