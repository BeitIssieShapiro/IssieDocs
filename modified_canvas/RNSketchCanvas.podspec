require 'json'
zipfile = "#{__dir__}/temp.zip"

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'RNSketchCanvas'
  s.version      = package['version']
  s.summary      = package['description']
  s.license      = package['license']
  s.homepage     = './issie-sketch-canvas'
  s.authors      = package['author']

  system("rm -rf #{zipfile} && zip -r #{zipfile} #{__dir__} > /dev/null")
  s.source = { :http => "file://#{zipfile}"}
  #s.source       = { :git => package['repository']['url'] }
  
  s.platform     = :ios, '8.0'
  s.source_files = 'ios/**/*.{h,m}'
  s.dependency   'React'
end
