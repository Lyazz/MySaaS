import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:vsc_quill_delta_to_html/vsc_quill_delta_to_html.dart';
import 'package:flutter_quill_delta_from_html/flutter_quill_delta_from_html.dart';
import 'package:flutter_quill_extensions/flutter_quill_extensions.dart';

class RichTextEditor extends StatefulWidget {
  final String? initialValue;
  final ValueChanged<String> onChanged;
  final String? placeholder;

  const RichTextEditor({
    super.key,
    this.initialValue,
    required this.onChanged,
    this.placeholder,
  });

  @override
  State<RichTextEditor> createState() => _RichTextEditorState();
}

class _RichTextEditorState extends State<RichTextEditor> {
  late QuillController _controller;

  // Base URL for the server (should match ApiService)
  static const String baseUrl = 'http://localhost:3000';

  @override
  void initState() {
    super.initState();
    _initializeController();
  }

  String _normalizeImageUrls(String html) {
    // Replace relative image URLs with absolute URLs
    // Match src="/uploads/..." and convert to src="http://localhost:3000/uploads/..."
    final regex = RegExp(r'src="(/uploads/[^"]*)"');
    return html.replaceAllMapped(regex, (match) {
      final relativePath = match.group(1);
      return 'src="$baseUrl$relativePath"';
    });
  }

  void _initializeController() {
    Document doc;
    if (widget.initialValue != null && widget.initialValue!.isNotEmpty) {
      try {
        // Normalize image URLs in HTML before converting to Delta
        final normalizedHtml = _normalizeImageUrls(widget.initialValue!);
        final delta = HtmlToDelta().convert(normalizedHtml);
        doc = Document.fromDelta(delta);
      } catch (e) {
        debugPrint('Error parsing HTML to Delta: $e');
        // Fallback: create a new document and insert plain text
        doc = Document();
        doc.insert(0, widget.initialValue!);
      }
    } else {
      doc = Document();
    }

    _controller = QuillController(
      document: doc,
      selection: const TextSelection.collapsed(offset: 0),
    );

    _controller.document.changes.listen((event) {
      try {
        final delta = _controller.document.toDelta();
        final converter = QuillDeltaToHtmlConverter(
          delta.toJson(),
          ConverterOptions.forEmail(),
        );
        final html = converter.convert();
        widget.onChanged(html);
      } catch (e) {
        debugPrint('Error converting Delta to HTML: $e');
      }
    });
  }

  @override
  void didUpdateWidget(RichTextEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialValue != oldWidget.initialValue) {
      if (_controller.document.toPlainText().trim().isEmpty &&
          widget.initialValue != null &&
          widget.initialValue!.isNotEmpty) {
        Document doc;
        try {
          final normalizedHtml = _normalizeImageUrls(widget.initialValue!);
          final delta = HtmlToDelta().convert(normalizedHtml);
          doc = Document.fromDelta(delta);
        } catch (e) {
          doc = Document();
          doc.insert(0, widget.initialValue!);
        }
        _controller.document = doc;
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFCBD5E1)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          QuillToolbar.simple(
            controller: _controller,
            configurations: const QuillSimpleToolbarConfigurations(
              showFontFamily: false,
              showSearchButton: false,
              showInlineCode: false,
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),
          SizedBox(
            height: 300,
            child: QuillEditor.basic(
              controller: _controller,
              configurations: QuillEditorConfigurations(
                placeholder: widget.placeholder,
                // Use default embed builders from flutter_quill_extensions
                embedBuilders: FlutterQuillEmbeds.editorBuilders(),
                sharedConfigurations: const QuillSharedConfigurations(
                  locale: Locale('en'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
