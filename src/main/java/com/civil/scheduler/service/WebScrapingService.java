package com.civil.scheduler.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class WebScrapingService {

    /**
     * Scrape construction-related information from the web as a fallback for AI.
     * Searches Google and extracts relevant snippets from top results.
     */
    public String scrapeAnswer(String query) {
        try {
            String searchQuery = query + " construction civil engineering";
            String encodedQuery = URLEncoder.encode(searchQuery, StandardCharsets.UTF_8);
            String searchUrl = "https://www.google.com/search?q=" + encodedQuery;

            Document doc = Jsoup.connect(searchUrl)
                    .userAgent(
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .timeout(10000)
                    .get();

            StringBuilder result = new StringBuilder();

            // Extract featured snippets and search result descriptions
            Elements snippets = doc.select("div.BNeawe, div.BNeawe.s3v9rd, span.hgKElc, div.kCrYT");
            Set<String> seen = new HashSet<>();

            int count = 0;
            for (Element snippet : snippets) {
                String text = snippet.text().trim();
                if (text.length() > 40 && text.length() < 2000 && !seen.contains(text)) {
                    seen.add(text);
                    result.append("• ").append(text).append("\n\n");
                    count++;
                    if (count >= 5)
                        break;
                }
            }

            if (result.length() == 0) {
                // Fallback: extract any meaningful text blocks
                Elements allText = doc.select("div");
                for (Element el : allText) {
                    String text = el.ownText().trim();
                    if (text.length() > 60 && text.length() < 1000 && !seen.contains(text)) {
                        seen.add(text);
                        result.append("• ").append(text).append("\n\n");
                        count++;
                        if (count >= 4)
                            break;
                    }
                }
            }

            if (result.length() > 0) {
                return "Here's what I found from web sources:\n\n" + result.toString().trim();
            } else {
                return "I couldn't find specific information about this topic. Please try rephrasing your question or consult the IS codes and construction manuals.";
            }

        } catch (Exception e) {
            return "Web search is temporarily unavailable. Error: " + e.getMessage()
                    + ". Please try again later or consult standard construction references.";
        }
    }
}
