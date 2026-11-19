require 'minitest/autorun'
require 'tmpdir'
require 'fileutils'
require 'dotenv'
require 'shellwords'
require 'xcodeproj'

# Run the real lane definitions with build, signing and upload actions replaced
# by recording stubs. Each test uses a temporary copy of the Xcode project.
class DeploymentHarness
  class UI
    def self.user_error!(message) = raise(ArgumentError, message)
    def self.message(*) = nil
    def self.success(*) = nil
  end

  module SharedValues
    SIGH_NAME = :profile_name
  end

  class << self
    attr_reader :lanes
    def default_platform(*) = nil
    def desc(*) = nil
    def platform(*) = yield
    def lane(name, &block)
      (@lanes ||= {})[name] = block
    end
  end

  attr_accessor :fail_build, :latest_build
  attr_reader :calls

  def initialize
    @calls = []
    @latest_build = 7
  end

  def run(lane)
    instance_exec(&self.class.lanes.fetch(lane))
  end

  def lane_context = { SharedValues::SIGH_NAME => 'IssieDocs App Store' }

  def method_missing(name, *args, **options)
    @calls << [name, options]
    case name
    when :app_store_connect_api_key then { key_id: 'test-key' }
    when :latest_testflight_build_number then @latest_build
    when :update_code_signing_settings
      File.write(File.join(options.fetch(:path), 'project.pbxproj'), 'temporary signing configuration')
    when :build_app
      raise 'Archive failed' if @fail_build
      '/tmp/IssieDocs.ipa'
    when :get_certificates, :get_provisioning_profile, :cocoapods, :upload_to_testflight, :sh
      nil
    else
      super
    end
  end

  def respond_to_missing?(*args) = true
end

class IOSDeploymentTest < Minitest::Test
  ROOT = File.expand_path('../../..', __dir__)
  ENV_KEYS = %w[ASC_KEY_ID ASC_ISSUER_ID ASC_KEY_PATH APPLE_TEAM_ID IOS_VERSION].freeze

  def setup
    @environment = ENV_KEYS.to_h { |key| [key, ENV[key]] }
    @directory = Dir.mktmpdir('issie-ios-deploy-')
    project = File.join(@directory, 'ios/IssieDocs.xcodeproj')
    FileUtils.mkdir_p(project)
    FileUtils.mkdir_p(File.join(@directory, 'node_modules'))
    @project_file = File.join(project, 'project.pbxproj')
    FileUtils.cp(File.join(ROOT, 'ios/IssieDocs.xcodeproj/project.pbxproj'), @project_file)
    @original_project = File.binread(@project_file)
    key_path = File.join(@directory, 'test.p8')
    File.write(key_path, 'test fixture')
    ENV.update('ASC_KEY_ID' => 'test-key', 'ASC_ISSUER_ID' => 'test-issuer',
               'ASC_KEY_PATH' => key_path, 'APPLE_TEAM_ID' => 'SKNJT9TD9G')
    ENV.delete('IOS_VERSION')
    source = File.read(File.join(ROOT, 'ios/fastlane/Fastfile'))
    source = source.sub(/^ROOT = .*$/, "ROOT = #{@directory.dump}")
    harness_class = Class.new(DeploymentHarness)
    harness_class.class_eval(source, File.join(ROOT, 'ios/fastlane/Fastfile'))
    @runner = harness_class.new
  end

  def teardown
    @environment.each { |key, value| value ? ENV[key] = value : ENV.delete(key) }
    FileUtils.remove_entry(@directory)
  end

  def test_upload_uses_issiedocs_and_the_next_remote_build
    @runner.run(:beta)
    build = @runner.calls.assoc(:build_app).last
    assert_equal 'IssieDocs', build[:scheme]
    assert_includes Shellwords.split(build[:xcargs]), 'CURRENT_PROJECT_VERSION=8'
    assert_equal 'Release', build[:configuration]
    upload = @runner.calls.assoc(:upload_to_testflight).last
    assert_equal '1469032311', upload[:apple_id]
    assert_equal 'com.issieshapiro.issiedoc.IssieDoc', upload[:app_identifier]
    assert_equal '/tmp/IssieDocs.ipa', upload[:ipa]
    assert_equal @original_project, File.binread(@project_file)
  end

  def test_archive_failure_restores_signing_and_stops_before_upload
    @runner.fail_build = true
    error = assert_raises(RuntimeError) { @runner.run(:beta) }
    assert_equal 'Archive failed', error.message
    assert_equal @original_project, File.binread(@project_file)
    assert_nil @runner.calls.assoc(:upload_to_testflight)
  end

  def test_missing_credentials_stop_before_any_apple_actions
    ENV['ASC_ISSUER_ID'] = ''
    assert_raises(ArgumentError) { @runner.run(:beta) }
    assert_empty @runner.calls
  end

  def test_invalid_version_stops_before_any_apple_actions
    ENV['IOS_VERSION'] = 'invalid version'
    assert_raises(ArgumentError) { @runner.run(:beta) }
    assert_empty @runner.calls
  end

  def test_marketing_version_override_and_local_build_floor
    ENV['IOS_VERSION'] = '1.8.1'
    @runner.latest_build = 0
    @runner.run(:beta)
    build = @runner.calls.assoc(:build_app).last
    assert_includes Shellwords.split(build[:xcargs]), 'MARKETING_VERSION=1.8.1'
    assert_includes Shellwords.split(build[:xcargs]), 'CURRENT_PROJECT_VERSION=2'
  end

  def test_check_only_reads_apple_build_information
    @runner.run(:check)
    assert @runner.calls.assoc(:latest_testflight_build_number)
    assert_nil @runner.calls.assoc(:get_certificates)
    assert_nil @runner.calls.assoc(:build_app)
    assert_nil @runner.calls.assoc(:upload_to_testflight)
  end
end
