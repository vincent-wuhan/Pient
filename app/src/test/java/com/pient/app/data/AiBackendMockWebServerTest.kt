package com.pient.app.data

import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class AiBackendMockWebServerTest {

    private lateinit var server: MockWebServer

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun testModelSendsOpenAiCompatibleProbeToLocalFakeProvider() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(200).setBody("{}"))
        val config = ProviderConfig(
            providerId = "local-fake",
            endpoint = server.url("/v1").toString(),
            apiKey = "test-key",
            apiType = "openai-completions",
            modelList = "pient-test",
        )

        val probe = AiBackend.testModel(config, "pient-test")

        assertTrue(probe.ok)
        val request = server.takeRequest()
        assertEquals("/v1/chat/completions", request.path)
        assertEquals("Bearer test-key", request.getHeader("Authorization"))
        val body = request.body.readUtf8()
        assertTrue(body.contains("\"model\":\"pient-test\""))
        assertTrue(body.contains("\"max_tokens\":16"))
        assertTrue(body.contains("\"stream\":false"))
    }

    @Test
    fun testModelReportsProviderError() = runBlocking {
        server.enqueue(
            MockResponse()
                .setResponseCode(401)
                .setBody("""{"error":{"message":"invalid key"}}"""),
        )
        val config = ProviderConfig(
            providerId = "local-fake",
            endpoint = server.url("/v1").toString(),
            apiKey = "bad-key",
            apiType = "openai-completions",
            modelList = "pient-test",
        )

        val probe = AiBackend.testModel(config, "pient-test")

        assertEquals(false, probe.ok)
        assertTrue(probe.detail.orEmpty().contains("invalid key"))
    }
}
