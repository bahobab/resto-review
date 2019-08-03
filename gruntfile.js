// credit https://medium.freecodecamp.org/a-guide-to-responsive-images-with-ready-to-use-templates-c400bd65c433

// module.exports = function(grunt) {
//     grunt.initConfig({
//       responsive_images: {
//         dev: {
//           options: {
//             engine: 'gm',
//             sizes: [
//               { name: 'sm', suffix: '_1x', quality: 60, width: 600 },
//               { name: 'sm', suffix: '_2x', quality: 60, width: 1200 },
//               { name: 'md', suffix: '_1x', quality: 60, width: 900 },
//               { name: 'md', suffix: '_2x', quality: 60, width: 1800 },
//               { name: 'lg', suffix: '_1x', quality: 60, width: 1440 },
//               { name: 'lg', suffix: '_2x', quality: 60, width: 2880 }
//             ]
//           },
//           files: [
//             {
//               expand: true,
//               src: ['**/*.{jpg,png}'],
//               cwd: 'img/',
//               dest: 'img/dest/'
//             }
//           ]
//         },
//         cwebp: {
//           dynamic: {
//             options: {
//               q: 60
//             },
//             files: [
//               {
//                 expand: true,
//                 cwd: 'img/',
//                 src: ['**/*.{jpg,png}'],
//                 dest: 'img/dest2/'
//               }
//             ]
//           }
//         }
//       }
//     });

//   grunt.loadNpmTasks('grunt-responsive-images');
//   grunt.loadNpmTasks('cwebp');
//   grunt.registerTask('default', ['responsive_images', 'cwebp']);
// };

// https://mikebabb.com/using-grunt-to-generate-webp-image-assets/

module.exports = function(grunt) { 
  grunt.initConfig({ 
      // WebP conversion task
      cwebp: {
          dynamic: {
              options: {
                  // Quality of WebP images: 
                  q: 75 
              }, 
              files: [{
                  // Output a new WebP file for every source image:
                   expand: true, 
                   // Where to find the images we'd like to be converted: 
                   cwd: 'img/', 
                   // The file formats to convert: 
                   src: ['**/*.{png,jpg,gif}'], 
                   // Where to place the resulting WebP files: 
                   dest: 'im/img_webp/' 
              }] 
          }
      }
  }); 
  // require('load-grunt-tasks')(grunt);
  // Run the task when we type "grunt dev" in to the terminal
  grunt.loadNpmTasks('grunt-cwebp');
  grunt.registerTask('default', ['cwebp']);
};