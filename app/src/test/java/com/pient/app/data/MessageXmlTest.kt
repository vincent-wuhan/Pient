package com.pient.app.data

import java.io.StringReader
import javax.xml.parsers.DocumentBuilderFactory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.w3c.dom.NodeList
import org.xml.sax.InputSource
import javax.xml.xpath.XPathConstants
import javax.xml.xpath.XPathFactory

class MessageXmlTest {

    @Test
    fun exportsOneAssistantTurnAsValidXmlAndEscapesContent() {
        val messages = listOf(
            Msg.User(text = "compare <release> & audit"),
            Msg.ToolCall(name = "read", params = "{\"path\":\"README.md\"}"),
            Msg.ToolResult(toolName = "read", preview = "line 1\nline 2"),
            Msg.Assistant(markdown = "<result> done & shipped", model = "zai-coding-cn/glm-4.6"),
        )

        val xml = turnXml(messages, 3)

        assertTrue(xml.contains("model=\"zai-coding-cn/glm-4.6\""))
        assertTrue(xml.contains("<text>&lt;result&gt; done &amp; shipped</text>"))
        assertEquals(1, nodeCount(xml, "/turn/text"))
    }

    @Test
    fun exportsSelectedUserTurnWithEscapedText() {
        val messages = listOf(
            Msg.Assistant(markdown = "previous answer", model = "old-model"),
            Msg.User(text = "<next> prompt & context"),
        )

        val xml = turnXml(messages, 1)

        assertEquals(
            "<next> prompt & context",
            evaluate(xml, "/turn/user/text"),
        )
    }

    private fun evaluate(xml: String, xpath: String): String =
        XPathFactory.newInstance().newXPath().evaluate(xpath, parsedDocument(xml))

    private fun nodeCount(xml: String, xpath: String): Int =
        (XPathFactory.newInstance().newXPath()
            .evaluate(xpath, parsedDocument(xml), XPathConstants.NODESET) as NodeList).length

    private fun parsedDocument(xml: String) = DocumentBuilderFactory.newInstance()
        .newDocumentBuilder()
        .parse(InputSource(StringReader(xml)))
}
