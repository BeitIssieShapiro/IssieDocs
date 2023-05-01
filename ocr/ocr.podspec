require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'OCR'
  s.version      = package['version']
  s.summary      = package['description']
  #s.license      = package['license']
  s.homepage     = './ocr'
  s.authors      = package['author']
  s.source = { :path => '.'}
  
  s.platform     = :ios, '14.3'
  s.source_files            = 'ios/*.{h,m,mm}', 'ios/include/**/*.h'
  s.private_header_files    = 'ios/include/**/*.h'
  s.public_header_files    = 'OCR/include/**/*.h'
  s.requires_arc            = true
  s.frameworks              = 'UIKit', 'Foundation'

  s.vendored_libraries = 'ios/lib/*.a'
  s.dependency   'React'
  s.xcconfig                = { 'OTHER_LDFLAGS' => '-lz',
                                'CLANG_CXX_LIBRARY' => 'compiler-default' }
end
